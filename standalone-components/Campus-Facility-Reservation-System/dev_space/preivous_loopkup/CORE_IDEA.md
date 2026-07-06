# Core Idea

This document captures the central concept and guiding philosophy for the Campus Facility Reservation System.

## 1. Core Concept

The Campus Facility Reservation System is a fair, accountable facility booking platform that uses token deposits and cancellation penalties to motivate actual usage while preventing wasteful, last-minute reservations.

### Key Principles

- **Fairness**: Users should only reserve facilities when they intend to use them.
- **Transparency**: Refund and penalty rules must be clear before booking.
- **Reliability**: The system must prevent concurrent reservations of the same slot.
- **Accountability**: Users incur penalties for late cancellations, preserving facility availability.
- **Role-awareness**: Students, professors, and admins have clear, distinct privileges.

## 2. Business Objective

- Reduce the number of unused campus facility reservations.
- Ensure facilities are accessible to the right people at the right times.
- Encourage discipline in cancellations through refundable deposits.
- Provide a campus booking system that is auditable, predictable, and easy to manage.

## 3. Engineering Objective

- Build a robust booking engine that enforces time-based business rules.
- Implement safe slot locking to avoid race conditions.
- Support both automated and approval-driven workflows.
- Maintain clear transaction logs and support strong testing of edge cases.

## 4. Why Token Deposits?

- Tokens represent prepaid commitment.
- Deposits discourage casual holds on slots.
- Refund rules create a natural incentive for users to cancel early or honor reservations.
- Penalties recover value for the facility when the booking is cancelled too late.

## 5. Why Approval Flow?

- Some campus spaces need higher access control (faculty labs, conference rooms, special equipment).
- Approval supports mixed-use facilities where professors deserve priority.
- Pending requests let students ask for access without blocking the entire calendar.
- Approvers can enforce fairness and resolve conflicts manually when policy requires.

## 6. Why Prevent Double-booking?

- A slot must only belong to one active reservation at a time.
- Simultaneous booking attempts must be resolved atomically.
- The system should use database-level locking or equivalent to ensure correctness.

## 7. Recommended Reservation Policy

- **General facilities**: Students and professors can both reserve these freely.
- **Restricted facilities**: Students may request booking; professors may book directly.
- **Professor-only resources**: Only professor roles may reserve.
- **Admin oversight**: Admins define facility rules, review pending requests, and manage exceptions.

## 8. User Experience Summary

- Users see a visual calendar of available slots using facilities as the primary axis.
- Each booking displays the required deposit and policy before confirmation.
- Cancellation shows refund/penalty before the user confirms.
- Approval requests show pending state and expected response behavior.
- The UI uses a fixed left facility axis and top time header, with a collapsible sidebar for navigation.
- A side drawer is used for booking details instead of a modal.

## 9. Expected Outcomes

- Fewer unused reservations and more efficient campus facility usage.
- Clear audit trail of booking decisions and cancellations.
- Role-based fairness and transparency for students and professors.
- A maintainable architecture that supports future feature growth.
