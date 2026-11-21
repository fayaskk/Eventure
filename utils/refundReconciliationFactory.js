import crypto from "crypto";

export const createRefundReconciliationService = ({
  RefundModel,
  PaymentModel,
  razorpayClient,
  handleRefundWebhook,
  now = () => new Date(),
  generateToken = () => crypto.randomUUID(),
  logger = console,
}) => {
  return async ({ limit = 50 } = {}) => {
    const currentTime = now();

    const staleBefore = new Date(
      currentTime.getTime() - 5 * 60 * 1000,
    );

    const expiredLockBefore = new Date(
      currentTime.getTime() - 10 * 60 * 1000,
    );

    const expiredInitiationBefore = new Date(
      currentTime.getTime() - 15 * 60 * 1000,
    );

    const eligibleLocks = {
      $or: [
        { reconciliationStartedAt: null },
        { reconciliationStartedAt: { $exists: false } },
        { reconciliationStartedAt: { $lte: expiredLockBefore } },
      ],
    };

    const eligibleInitiation = {
      $or: [
        { initiationStartedAt: null },
        { initiationStartedAt: { $exists: false } },
        { initiationStartedAt: { $lte: expiredInitiationBefore } },
      ],
    };

    const eligibleStatus = {
      $in: [
        "pending",
        "processing",
        "requires_reconciliation",
      ],
    };

    const candidates = await RefundModel.find({
      status: eligibleStatus,
      updatedAt: {
        $lte: staleBefore,
      },
      $and: [
        eligibleLocks,
        eligibleInitiation,
      ],
    })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .select("_id")
      .lean();

    const results = {
      checked: 0,
      processed: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
    };

    for (const candidate of candidates) {
      const reconciliationToken = generateToken();
      const claimTime = now();

      const refundRecord = await RefundModel.findOneAndUpdate(
        {
          _id: candidate._id,
          status: eligibleStatus,
          updatedAt: {
            $lte: staleBefore,
          },
          $and: [
            eligibleLocks,
            eligibleInitiation,
          ],
        },
        {
          $set: {
            reconciliationStartedAt: claimTime,
            reconciliationToken,
            lastReconciliationAt: claimTime,
          },
          $inc: {
            reconciliationAttempts: 1,
          },
        },
        {
          new: true,
        },
      );

      if (!refundRecord) {
        results.skipped++;
        continue;
      }

      results.checked++;

      try {
        const payment = await PaymentModel.findById(
          refundRecord.payment,
        ).select("razorpayPaymentId amount currency");

        if (
          !payment ||
          !payment.razorpayPaymentId ||
          payment.currency !== "INR" ||
          !Number.isSafeInteger(payment.amount) ||
          payment.amount <= 0
        ) {
          throw new Error(
            "Associated payment details are missing or invalid.",
          );
        }

        if (
          payment.amount !== refundRecord.paidAmountPaise ||
          !Number.isSafeInteger(refundRecord.amount) ||
          refundRecord.amount <= 0 ||
          refundRecord.amount > payment.amount
        ) {
          throw new Error(
            "Internal payment and refund amounts do not match.",
          );
        }

        const isStillOwner = async () => {
          const currentRefund = await RefundModel.findOne({
            _id: refundRecord._id,
            reconciliationToken,
            status: eligibleStatus,
          })
            .select("_id")
            .lean();

          return Boolean(currentRefund);
        };

        let providerRefund;

        if (refundRecord.razorpayRefundId) {
          providerRefund = await razorpayClient.payments.fetchRefund(
            payment.razorpayPaymentId,
            refundRecord.razorpayRefundId,
          );
        } else {
          const matchingRefunds = [];

          const pageSize = 100;
          let skip = 0;
          let totalCount = null;

          while (
            totalCount === null ||
            skip < totalCount
          ) {
            const response =
              await razorpayClient.payments.fetchMultipleRefund(
                payment.razorpayPaymentId,
                {
                  count: pageSize,
                  skip,
                },
              );

            const providerRefunds = response?.items || [];

            if (!Array.isArray(providerRefunds)) {
              throw new Error(
                "Invalid refund collection returned by Razorpay.",
              );
            }

            totalCount = Number.isSafeInteger(response?.count)
              ? response.count
              : providerRefunds.length;

            const matches = providerRefunds.filter(
              (item) =>
                item.receipt === refundRecord._id.toString(),
            );

            matchingRefunds.push(...matches);

            if (matchingRefunds.length > 1) {
              throw new Error(
                "Multiple Razorpay refunds matched the same internal receipt.",
              );
            }

            if (matchingRefunds.length === 1) {
              break;
            }

            if (providerRefunds.length < pageSize) {
              break;
            }

            skip += pageSize;
          }

          if (matchingRefunds.length === 0) {
            await RefundModel.updateOne(
              {
                _id: refundRecord._id,
                reconciliationToken,
                status: eligibleStatus,
              },
              {
                $set: {
                  status: "requires_reconciliation",
                  providerStatus: "not_found",
                  failureReason:
                    "No matching Razorpay refund was found. The refund outcome remains unresolved.",
                },
              },
            );

            results.pending++;
            continue;
          }

          providerRefund = matchingRefunds[0];
        }

        if (
          !providerRefund?.id ||
          providerRefund.payment_id !== payment.razorpayPaymentId ||
          providerRefund.receipt !== refundRecord._id.toString() ||
          providerRefund.amount !== refundRecord.amount ||
          providerRefund.currency !== "INR" ||
          !Number.isSafeInteger(providerRefund.amount)
        ) {
          throw new Error(
            "Razorpay refund details do not match the internal refund record.",
          );
        }

        if (
          refundRecord.razorpayRefundId &&
          refundRecord.razorpayRefundId !== providerRefund.id
        ) {
          throw new Error(
            "Razorpay refund ID does not match the stored refund ID.",
          );
        }

        if (!(await isStillOwner())) {
          results.skipped++;
          continue;
        }

        const providerStatus = providerRefund.status;

        if (!["processed", "failed"].includes(providerStatus)) {
          await RefundModel.updateOne(
            {
              _id: refundRecord._id,
              reconciliationToken,
              status: eligibleStatus,
            },
            {
              $set: {
                razorpayRefundId: providerRefund.id,
                providerStatus,
                status: "requires_reconciliation",
                failureReason:
                  "Razorpay refund is still awaiting a final outcome.",
              },
            },
          );

          results.pending++;
          continue;
        }

        const event = {
          event:
            providerStatus === "processed"
              ? "refund.processed"
              : "refund.failed",
          payload: {
            refund: {
              entity: providerRefund,
            },
          },
        };

        await handleRefundWebhook(event, {
          reconciliationToken,
        });

        if (providerStatus === "processed") {
          results.processed++;
        } else {
          results.failed++;
        }
      } catch (error) {
        logger.error(
          `Refund reconciliation failed for ${refundRecord._id}:`,
          error.message,
        );

        await RefundModel.updateOne(
          {
            _id: refundRecord._id,
            reconciliationToken,
            status: eligibleStatus,
          },
          {
            $set: {
              status: "requires_reconciliation",
              failureReason: error.message,
            },
          },
        );

        results.pending++;
      } finally {
        await RefundModel.updateOne(
          {
            _id: refundRecord._id,
            reconciliationToken,
          },
          {
            $set: {
              reconciliationStartedAt: null,
              reconciliationToken: null,
            },
          },
        );
      }
    }

    return results;
  };
};