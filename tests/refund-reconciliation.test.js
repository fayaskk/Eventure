import test from "node:test";
import assert from "node:assert/strict";

import {
  createRefundReconciliationService,
} from "../utils/refundReconciliationFactory.js";

const refundId = "refund123";
const paymentId = "payment123";
const razorpayPaymentId = "pay_123";
const razorpayRefundId = "rfnd_123";

const createQuery = (value) => ({
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  select() {
    return this;
  },
  lean() {
    return Promise.resolve(value);
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

const createHarness = ({
  providerRefund = null,
  providerRefunds = [],
  payment = {
    razorpayPaymentId,
    amount: 10000,
    currency: "INR",
  },
  storedRefundId = null,
  claimAllowed = true,
  ownershipAllowed = true,
  webhookError = null,
} = {}) => {
  const refundRecord = {
    _id: refundId,
    payment: paymentId,
    paidAmountPaise: 10000,
    amount: 8000,
    razorpayRefundId: storedRefundId,
    status: "processing",
    reconciliationToken: null,
    reconciliationStartedAt: null,
    reconciliationAttempts: 0,
  };

  const updates = [];
  const webhookCalls = [];
  const razorpayCalls = [];

  const RefundModel = {
    find() {
      return createQuery([{ _id: refundId }]);
    },

    findOneAndUpdate(query, update) {
      if (!claimAllowed) {
        return Promise.resolve(null);
      }

      if (
        query._id !== refundId ||
        refundRecord.status === "successful" ||
        refundRecord.status === "failed"
      ) {
        return Promise.resolve(null);
      }

      Object.assign(refundRecord, update.$set);

      refundRecord.reconciliationAttempts +=
        update.$inc?.reconciliationAttempts || 0;

      return Promise.resolve({ ...refundRecord });
    },

    findOne(query) {
      const matches =
        ownershipAllowed &&
        query._id === refundId &&
        query.reconciliationToken ===
          refundRecord.reconciliationToken &&
        refundRecord.status !== "successful" &&
        refundRecord.status !== "failed";

      return createQuery(matches ? { _id: refundId } : null);
    },

    updateOne(query, update) {
      updates.push({ query, update });

      if (
        query._id === refundId &&
        query.reconciliationToken ===
          refundRecord.reconciliationToken
      ) {
        Object.assign(refundRecord, update.$set);
      }

      return Promise.resolve({ modifiedCount: 1 });
    },
  };

  const PaymentModel = {
    findById(id) {
      assert.equal(id, paymentId);

      return {
        select() {
          return Promise.resolve(payment);
        },
      };
    },
  };

  const razorpayClient = {
    payments: {
      async fetchRefund(receivedPaymentId, receivedRefundId) {
        razorpayCalls.push({
          method: "fetchRefund",
          paymentId: receivedPaymentId,
          refundId: receivedRefundId,
        });

        return providerRefund;
      },

      async fetchMultipleRefund(receivedPaymentId, options) {
        razorpayCalls.push({
          method: "fetchMultipleRefund",
          paymentId: receivedPaymentId,
          options,
        });

        return {
          count: providerRefunds.length,
          items: providerRefunds,
        };
      },
    },
  };

  const handleRefundWebhook = async (event, options) => {
    webhookCalls.push({ event, options });

    if (webhookError) {
      throw webhookError;
    }

    if (event.event === "refund.processed") {
      refundRecord.status = "successful";
    }

    if (event.event === "refund.failed") {
      refundRecord.status = "failed";
    }
  };

  const service = createRefundReconciliationService({
    RefundModel,
    PaymentModel,
    razorpayClient,
    handleRefundWebhook,
    now: () => new Date("2026-11-20T12:00:00.000Z"),
    generateToken: () => "test-reconciliation-token",
    logger: {
      error() {},
    },
  });

  return {
    service,
    refundRecord,
    updates,
    webhookCalls,
    razorpayCalls,
  };
};

const createProviderRefund = (overrides = {}) => ({
  id: razorpayRefundId,
  payment_id: razorpayPaymentId,
  receipt: refundId,
  amount: 8000,
  currency: "INR",
  status: "processed",
  ...overrides,
});

test("should reconcile a successfully processed refund", async () => {
  const harness = createHarness({
    providerRefund: createProviderRefund(),
    storedRefundId: razorpayRefundId,
  });

  const result = await harness.service();

  assert.equal(result.checked, 1);
  assert.equal(result.processed, 1);
  assert.equal(result.failed, 0);
  assert.equal(harness.webhookCalls.length, 1);

  assert.equal(
    harness.webhookCalls[0].event.event,
    "refund.processed",
  );

  assert.equal(
    harness.webhookCalls[0].options.reconciliationToken,
    "test-reconciliation-token",
  );

  assert.equal(harness.refundRecord.status, "successful");
});

test("should reconcile a failed refund", async () => {
  const harness = createHarness({
    providerRefund: createProviderRefund({
      status: "failed",
    }),
    storedRefundId: razorpayRefundId,
  });

  const result = await harness.service();

  assert.equal(result.checked, 1);
  assert.equal(result.failed, 1);
  assert.equal(harness.webhookCalls.length, 1);

  assert.equal(
    harness.webhookCalls[0].event.event,
    "refund.failed",
  );

  assert.equal(harness.refundRecord.status, "failed");
});

test("should keep a refund pending when Razorpay has no matching refund", async () => {
  const harness = createHarness({
    providerRefunds: [],
  });

  const result = await harness.service();

  assert.equal(result.checked, 1);
  assert.equal(result.pending, 1);
  assert.equal(harness.webhookCalls.length, 0);

  assert.equal(
    harness.refundRecord.status,
    "requires_reconciliation",
  );

  assert.equal(
    harness.refundRecord.providerStatus,
    "not_found",
  );

  assert.equal(
    harness.razorpayCalls[0].method,
    "fetchMultipleRefund",
  );
});

test("should not create another refund when the provider refund is missing", async () => {
  const harness = createHarness({
    providerRefunds: [],
  });

  await harness.service();

  assert.equal(
    harness.razorpayCalls.some(
      (call) => call.method === "createRefund",
    ),
    false,
  );
});

test("should reject a provider refund with an incorrect amount", async () => {
  const harness = createHarness({
    providerRefund: createProviderRefund({
      amount: 7000,
    }),
    storedRefundId: razorpayRefundId,
  });

  const result = await harness.service();

  assert.equal(result.pending, 1);
  assert.equal(harness.webhookCalls.length, 0);

  assert.equal(
    harness.refundRecord.status,
    "requires_reconciliation",
  );
});

test("should reject a payment with an invalid currency", async () => {
  const harness = createHarness({
    payment: {
      razorpayPaymentId,
      amount: 10000,
      currency: "USD",
    },
    providerRefund: createProviderRefund(),
    storedRefundId: razorpayRefundId,
  });

  const result = await harness.service();

  assert.equal(result.pending, 1);
  assert.equal(harness.webhookCalls.length, 0);
});

test("should skip a refund when another worker owns the lock", async () => {
  const harness = createHarness({
    providerRefund: createProviderRefund(),
    storedRefundId: razorpayRefundId,
    ownershipAllowed: false,
  });

  const result = await harness.service();

  assert.equal(result.checked, 1);
  assert.equal(result.skipped, 1);
  assert.equal(harness.webhookCalls.length, 0);
});

test("should keep reconciliation required when the webhook handler fails", async () => {
  const harness = createHarness({
    providerRefund: createProviderRefund(),
    storedRefundId: razorpayRefundId,
    webhookError: new Error("Webhook processing failed"),
  });

  const result = await harness.service();

  assert.equal(result.pending, 1);
  assert.equal(harness.webhookCalls.length, 1);

  assert.equal(
    harness.refundRecord.status,
    "requires_reconciliation",
  );
});

test("should release the reconciliation lock after processing", async () => {
  const harness = createHarness({
    providerRefund: createProviderRefund(),
    storedRefundId: razorpayRefundId,
  });

  await harness.service();

  assert.equal(
    harness.refundRecord.reconciliationStartedAt,
    null,
  );

  assert.equal(
    harness.refundRecord.reconciliationToken,
    null,
  );
});

test("should skip a refund when the atomic claim fails", async () => {
  const harness = createHarness({
    claimAllowed: false,
  });

  const result = await harness.service();

  assert.equal(result.checked, 0);
  assert.equal(result.skipped, 1);
  assert.equal(harness.razorpayCalls.length, 0);
  assert.equal(harness.webhookCalls.length, 0);
});