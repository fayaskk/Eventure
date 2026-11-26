import "dotenv/config";
import mongoose from "mongoose";
import process from "process";
import assert from "node:assert/strict";
import {
  before,
  beforeEach,
  after,
  test,
} from "node:test";
import { User } from "../models/user.model.js";
import { Event } from "../models/event.model.js";
import { Booking } from "../models/booking.model.js";
import { Payment } from "../models/payment.model.js";
import { Ticket } from "../models/ticket.model.js";
import { Refund } from "../models/refund.model.js";

import {
  handleRazorpayRefundWebhookService,
} from "../services/payment.service.js";

const createRefundFixture = async () => {
  const hostId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  const razorpayPaymentId = "pay_integration_test_001";
  const razorpayOrderId = "order_integration_test_001";

  const event = await Event.create({
    host: hostId,
    eventName: "Integration Test Concert",
    description: "Event created for refund integration testing",
    category: categoryId,
    banner: "integration-test-banner.jpg",
    location: {
      venue: "Test Auditorium",
      address: "Test Street",
      city: "Karimnagar",
      state: "Telangana",
      pincode: "505001",
    },
    eventDate: new Date("2027-12-20"),
    startTime: "18:00",
    endTime: "22:00",
    tickets: [
      {
        name: "Premium",
        price: 1000,
        quantity: 100,
        reserved: 0,
        sold: 1,
      },
    ],
    status: "approved",
    isVisible: true,
  });

  const eventTicket = event.tickets[0];

  const booking = await Booking.create({
    event: event._id,
    user: userId,
    tickets: [
      {
        ticketId: eventTicket._id,
        ticketName: "Premium",
        quantity: 1,
        price: 1000,
        subtotal: 1000,
      },
    ],
    ticketSubtotal: 1000,
    totalAmount: 1000,
    bookingReference: "BOOKING-REFUND-TEST-001",
    bookingStatus: "confirmed",
    paymentStatus: "successful",
    paymentExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const payment = await Payment.create({
    booking: booking._id,
    razorpayOrderId,
    razorpayPaymentId,
    amount: 100000,
    currency: "INR",
    status: "refund_pending",
    totalRefundedPaise: 0,
    platformCommissionPercent: 10,
    platformFee: 10000,
    hostEarnings: 90000,
    settlementStatus: "available",
    settlement: null,
  });

  const ticket = await Ticket.create({
    booking: booking._id,
    event: event._id,
    ticketTypeId: eventTicket._id,
    ticketName: "Premium",
    price: 1000,
    paidAmountPaise: 100000,
    platformFeePaise: 10000,
    hostEarningsPaise: 90000,
    ticketCode: "TICKET-REFUND-TEST-001",
    owner: userId,
    status: "valid",
    attendanceStatus: "not_checked_in",
    cancellationStatus: "pending",
    cancellationPolicy: {
      window: "more_than_3_days",
      feePercent: 0,
    },
    refundStatus: "processing",
  });

  const refund = await Refund.create({
    ticket: ticket._id,
    booking: booking._id,
    payment: payment._id,
    paidAmountPaise: 100000,
    cancellationFeePercent: 0,
    cancellationFeePaise: 0,
    amount: 100000,
    policyWindow: "more_than_3_days",
    status: "processing",
    reason: "Integration test refund",
    cancellationRequestedAt: new Date(),
    initiatedAt: new Date(),
    providerStatus: "pending",
  });

  return {
    event,
    booking,
    payment,
    ticket,
    refund,
    razorpayPaymentId,
  };
};
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI;
const EXPECTED_DATABASE_NAME = "eventure_test";

const getDatabaseNameFromUri = (uri) => {
  if (!uri) {
    throw new Error("TEST_MONGODB_URI is missing.");
  }

  const parsedUri = new URL(uri);
  const databaseName = decodeURIComponent(
    parsedUri.pathname.replace(/^\/+/, "")
  );

  if (databaseName !== EXPECTED_DATABASE_NAME) {
    throw new Error(
      `Unsafe test database: expected "${EXPECTED_DATABASE_NAME}", received "${databaseName || "no database name"}".`
    );
  }

  return databaseName;
};

before(async () => {
  getDatabaseNameFromUri(TEST_MONGODB_URI);

  await mongoose.connect(TEST_MONGODB_URI);

  const actualDatabaseName = mongoose.connection.db.databaseName;

  if (actualDatabaseName !== EXPECTED_DATABASE_NAME) {
    await mongoose.disconnect();

    throw new Error(
      `Integration tests refused to run against "${actualDatabaseName}".`
    );
  }

  console.log(`Connected to test database: ${actualDatabaseName}`);
});
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    Ticket.deleteMany({}),
    Refund.deleteMany({}),
  ]);
});
after(async () => {
  await mongoose.disconnect();
});

test("should connect to the dedicated Eventure test database", () => {
  assert.equal(
    mongoose.connection.db.databaseName,
    EXPECTED_DATABASE_NAME
  );
});
test("should successfully process a refund webhook", async () => {
  const fixture = await createRefundFixture();

  const webhookEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_integration_test_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  const result = await handleRazorpayRefundWebhookService(
    webhookEvent
  );

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "successful");

  assert.equal(updatedTicket.status, "refunded");
  assert.equal(updatedTicket.refundStatus, "successful");

  assert.equal(updatedPayment.totalRefundedPaise, 100000);
  assert.equal(updatedPayment.status, "refunded");

  assert.equal(updatedEvent.tickets[0].sold, 0);

  assert.equal(updatedRefund.razorpayRefundId, "rfnd_integration_test_001");

  assert.ok(result);
});
test("should handle duplicate successful refund webhooks idempotently", async () => {
  const fixture = await createRefundFixture();

  const webhookEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_duplicate_test_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  const firstResult = await handleRazorpayRefundWebhookService(
    webhookEvent
  );

  const secondResult = await handleRazorpayRefundWebhookService(
    webhookEvent
  );

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "successful");

  assert.equal(updatedTicket.status, "refunded");

  assert.equal(updatedPayment.totalRefundedPaise, 100000);

  assert.equal(updatedEvent.tickets[0].sold, 0);

  assert.ok(firstResult);
  assert.ok(secondResult);
});
test("should restore ticket when refund fails", async () => {
  const fixture = await createRefundFixture();

  const webhookEvent = {
    event: "refund.failed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_failed_test_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "failed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  const result = await handleRazorpayRefundWebhookService(
    webhookEvent
  );

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "failed");

  assert.equal(updatedTicket.status, "valid");
  assert.equal(updatedTicket.cancellationStatus, "none");
  assert.equal(updatedTicket.refundStatus, "none");

  assert.equal(updatedTicket.cancellationRequestedAt, null);
  assert.equal(updatedTicket.cancellationExpiresAt, null);

  assert.equal(updatedPayment.status, "successful");
  assert.equal(updatedPayment.totalRefundedPaise, 0);

  assert.equal(updatedEvent.tickets[0].sold, 1);

  assert.ok(result);
});
test("should flag a conflict when provider refund amount is incorrect", async () => {
  const fixture = await createRefundFixture();

  const webhookEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_incorrect_amount_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 90000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  const result = await handleRazorpayRefundWebhookService(webhookEvent);

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "requires_reconciliation");

  assert.equal(
    updatedRefund.providerStatus,
    "conflict_refund.processed"
  );

  assert.equal(
    updatedTicket.refundStatus,
    "requires_reconciliation"
  );

  assert.equal(updatedTicket.status, "valid");

  assert.equal(updatedPayment.status, "refund_review");
  assert.equal(updatedPayment.settlementStatus, "on_hold");

  assert.equal(updatedPayment.totalRefundedPaise, 0);

  assert.equal(updatedEvent.tickets[0].sold, 1);

  assert.ok(result);
});
test("should reject refund webhook with incorrect payment ID", async () => {
  const fixture = await createRefundFixture();

  const webhookEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_wrong_payment_001",
          payment_id: "pay_wrong_payment_001",
          amount: 100000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  await assert.rejects(
    () => handleRazorpayRefundWebhookService(webhookEvent),
    {
      message: "Associated payment record could not be verified.",
    }
  );

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "processing");
  assert.equal(updatedRefund.razorpayRefundId, null);

  assert.equal(updatedTicket.status, "valid");
  assert.equal(updatedTicket.refundStatus, "processing");

  assert.equal(updatedPayment.status, "refund_pending");
  assert.equal(updatedPayment.totalRefundedPaise, 0);

  assert.equal(updatedEvent.tickets[0].sold, 1);
});
test("should flag a conflict when settlement has already been requested", async () => {
  const fixture = await createRefundFixture();

  fixture.payment.settlementStatus = "requested";
  await fixture.payment.save();

  const webhookEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_settlement_conflict_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  const result = await handleRazorpayRefundWebhookService(webhookEvent);

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "requires_reconciliation");

  assert.equal(
    updatedRefund.providerStatus,
    "conflict_refund.processed"
  );

  assert.equal(updatedTicket.refundStatus, "requires_reconciliation");

  assert.equal(updatedPayment.status, "refund_review");
  assert.equal(updatedPayment.settlementStatus, "on_hold");

  assert.equal(updatedPayment.totalRefundedPaise, 0);

  assert.equal(updatedEvent.tickets[0].sold, 1);

  assert.equal(result.requiresReconciliation, true);
});
test("should flag a conflict when a successful refund receives a failed webhook", async () => {
  const fixture = await createRefundFixture();

  const processedEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_conflicting_status_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  await handleRazorpayRefundWebhookService(processedEvent);

  const failedEvent = {
    event: "refund.failed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_conflicting_status_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "failed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  const result = await handleRazorpayRefundWebhookService(failedEvent);

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "successful");

  assert.equal(updatedTicket.status, "refunded");
  assert.equal(updatedTicket.refundStatus, "successful");

  assert.equal(updatedPayment.status, "refund_review");
  assert.equal(updatedPayment.settlementStatus, "on_hold");

  assert.equal(updatedPayment.totalRefundedPaise, 100000);

  assert.equal(updatedEvent.tickets[0].sold, 0);

  assert.equal(result.requiresReconciliation, true);
});
test("should flag a conflict when refund webhook arrives for a checked-in ticket", async () => {
  const fixture = await createRefundFixture();

  fixture.ticket.attendanceStatus = "checked_in";
  fixture.ticket.checkedInAt = new Date();
  await fixture.ticket.save();

  const webhookEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_checked_in_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  const result = await handleRazorpayRefundWebhookService(webhookEvent);

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "requires_reconciliation");

  assert.equal(
    updatedRefund.providerStatus,
    "conflict_refund.processed"
  );

  assert.equal(updatedTicket.status, "valid");
  assert.equal(updatedTicket.attendanceStatus, "checked_in");
  assert.equal(updatedTicket.refundStatus, "requires_reconciliation");

  assert.equal(updatedPayment.status, "refund_review");
  assert.equal(updatedPayment.settlementStatus, "on_hold");

  assert.equal(updatedPayment.totalRefundedPaise, 0);

  assert.equal(updatedEvent.tickets[0].sold, 1);

  assert.equal(result.requiresReconciliation, true);
});
test("should detect different Razorpay refund IDs for the same refund record", async () => {
  const fixture = await createRefundFixture();

  const firstWebhookEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_duplicate_001",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  await handleRazorpayRefundWebhookService(firstWebhookEvent);

  const secondWebhookEvent = {
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_duplicate_002",
          payment_id: fixture.razorpayPaymentId,
          amount: 100000,
          currency: "INR",
          status: "processed",
          receipt: fixture.refund._id.toString(),
        },
      },
    },
  };

  const result = await handleRazorpayRefundWebhookService(
    secondWebhookEvent
  );

  const updatedRefund = await Refund.findById(fixture.refund._id);
  const updatedTicket = await Ticket.findById(fixture.ticket._id);
  const updatedPayment = await Payment.findById(fixture.payment._id);
  const updatedEvent = await Event.findById(fixture.event._id);

  assert.equal(updatedRefund.status, "successful");
  assert.equal(updatedRefund.razorpayRefundId, "rfnd_duplicate_001");

  assert.equal(updatedTicket.status, "refunded");
  assert.equal(updatedTicket.razorpayRefundId, "rfnd_duplicate_001");

  assert.equal(updatedPayment.status, "refund_review");
  assert.equal(updatedPayment.settlementStatus, "on_hold");
  assert.equal(updatedPayment.totalRefundedPaise, 100000);

  assert.equal(updatedEvent.tickets[0].sold, 0);

  assert.equal(result.requiresReconciliation, true);
});