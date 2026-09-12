ALTER TABLE wp_bl_withdrawals
  DROP INDEX uq_reference,
  ADD UNIQUE KEY uq_reference (instructor_id, payout_reference);