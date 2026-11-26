import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { allocatePaymentToTickets } from "../utils/paymentAllocation.js";

describe("Payment Allocation Tests", () => {
  test("should allocate equal-price tickets correctly", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 500, quantity: 2 },
    ];

    const result = allocatePaymentToTickets(tickets, 100000, 10);

    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((ticket) => ticket.paidAmountPaise),
      [50000, 50000],
    );
  });

  test("should allocate different-price tickets proportionally", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 1000, quantity: 1 },
      { ticketName: "Silver", ticketId: "silver", price: 500, quantity: 1 },
    ];

    const result = allocatePaymentToTickets(tickets, 120000, 10);

    assert.deepEqual(
      result.map((ticket) => ticket.paidAmountPaise),
      [80000, 40000],
    );
  });

  test("should allocate discounted payment correctly", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 1000, quantity: 1 },
      { ticketName: "Silver", ticketId: "silver", price: 1000, quantity: 1 },
    ];

    const result = allocatePaymentToTickets(tickets, 150000, 10);

    assert.deepEqual(
      result.map((ticket) => ticket.paidAmountPaise),
      [75000, 75000],
    );
  });

  test("should handle free and paid tickets together", () => {
    const tickets = [
      { ticketName: "Free", ticketId: "free", price: 0, quantity: 1 },
      { ticketName: "Gold", ticketId: "gold", price: 1000, quantity: 1 },
    ];

    const result = allocatePaymentToTickets(tickets, 100000, 10);

    assert.equal(result[0].paidAmountPaise, 0);
    assert.equal(result[1].paidAmountPaise, 100000);
  });

  test("should handle completely free bookings", () => {
    const tickets = [
      { ticketName: "Free", ticketId: "free", price: 0, quantity: 2 },
    ];

    const result = allocatePaymentToTickets(tickets, 0, 10);

    assert.equal(result.length, 2);

    for (const ticket of result) {
      assert.equal(ticket.paidAmountPaise, 0);
      assert.equal(ticket.platformFeePaise, 0);
      assert.equal(ticket.hostEarningsPaise, 0);
    }
  });

  test("should calculate platform commission correctly", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 1000, quantity: 1 },
    ];

    const result = allocatePaymentToTickets(tickets, 100000, 10);

    assert.equal(result[0].platformFeePaise, 10000);
    assert.equal(result[0].hostEarningsPaise, 90000);
  });

  test("should calculate host earnings correctly", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 2000, quantity: 1 },
    ];

    const result = allocatePaymentToTickets(tickets, 200000, 15);

    assert.equal(result[0].platformFeePaise, 30000);
    assert.equal(result[0].hostEarningsPaise, 170000);
  });

  test("should distribute fractional paise using largest remainder", () => {
    const tickets = [
      { ticketName: "A", ticketId: "a", price: 1, quantity: 1 },
      { ticketName: "B", ticketId: "b", price: 1, quantity: 1 },
      { ticketName: "C", ticketId: "c", price: 1, quantity: 1 },
    ];

    const result = allocatePaymentToTickets(tickets, 100, 0);

    assert.deepEqual(
      result.map((ticket) => ticket.paidAmountPaise),
      [34, 33, 33],
    );
  });

  test("should maintain total financial allocation consistency", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 999, quantity: 2 },
      { ticketName: "Silver", ticketId: "silver", price: 499, quantity: 2 },
    ];

    const totalPaidPaise = 250000;

    const result = allocatePaymentToTickets(tickets, totalPaidPaise, 10);

    const totalPaid = result.reduce(
      (sum, ticket) => sum + ticket.paidAmountPaise,
      0,
    );

    const totalPlatformFee = result.reduce(
      (sum, ticket) => sum + ticket.platformFeePaise,
      0,
    );

    const totalHostEarnings = result.reduce(
      (sum, ticket) => sum + ticket.hostEarningsPaise,
      0,
    );

    assert.equal(totalPaid, totalPaidPaise);
    assert.equal(totalPlatformFee + totalHostEarnings, totalPaidPaise);
  });

  test("should reject payment exceeding original ticket subtotal", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 500, quantity: 1 },
    ];

    assert.throws(
      () => allocatePaymentToTickets(tickets, 60000, 10),
      /Payment amount cannot exceed/,
    );
  });

  test("should reject invalid commission percentage", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 1000, quantity: 1 },
    ];

    assert.throws(() => allocatePaymentToTickets(tickets, 100000, 110));
  });

  test("should reject negative ticket price", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: -100, quantity: 1 },
    ];

    assert.throws(() => allocatePaymentToTickets(tickets, 10000, 10));
  });

  test("should reject invalid ticket quantity", () => {
    const tickets = [
      { ticketName: "Gold", ticketId: "gold", price: 1000, quantity: 0 },
    ];

    assert.throws(() => allocatePaymentToTickets(tickets, 100000, 10));
  });
});