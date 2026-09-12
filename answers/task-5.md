# Task 5 — Database

> Paste the **terminal output** of every query, not just the SQL. For this task
> the output is the answer.

## 5.1 Investigate — NULL vs 0

```sql
-- your query
mysql> SELECT
    ->   id,
    ->   title,
    ->   enrolment_count,
    ->   enrolment_count IS NULL AS enrolment_count_is_null,
    ->   average_rating,
    ->   average_rating IS NULL AS average_rating_is_null
    -> FROM wp_bl_courses
    -> ORDER BY id;
x
```

```
-- output

+----+------------------------------+-----------------+-------------------------+----------------+------------------------+
| id | title                        | enrolment_count | enrolment_count_is_null | average_rating | average_rating_is_null |
+----+------------------------------+-----------------+-------------------------+----------------+------------------------+
|  1 | Introduction to Bread Baking |             128 |                       0 |           4.60 |                      0 |
|  2 | Sourdough Starters           |              64 |                       0 |           4.20 |                      0 |
|  3 | Pastry Fundamentals          |            NULL |                       1 |           NULL |                      1 |
|  4 | Cake Decorating Basics       |               9 |                       0 |           0.00 |                      0 |
|  5 | Advanced Laminated Dough     |               0 |                       0 |           NULL |                      1 |
+----+------------------------------+-----------------+-------------------------+----------------+------------------------+
5 rows in set (0.00 sec)
```

**Which rows are genuinely 0, and which are NULL?**
Advanced Laminated Dough has a genuine enrolment count of 0. Pastry Fundamentals has NULL enrolment count and rating, meaning those values have not yet been counted or calculated. Cake Decorating Basics has a genuine measured rating of 0.00, while its enrolment count is 9.

**Why does this matter to a user?** (two sentences)
Displaying NULL as zero falsely implies that a measurement was taken and the result was zero. A user may interpret an unprocessed or unknown result as poor course performance

## 5.2 The constraint

**Proof — two inserts with the same instructor_id and payout_reference:**

```sql
-- your inserts
SET @instructor_id = (
  SELECT ID
  FROM wp_users
  WHERE user_email = 'instructor@example.test'
);

INSERT INTO wp_bl_withdrawals
  (instructor_id, amount_minor, status, payout_reference, cancelled_at)
VALUES
  (@instructor_id, 1, 'cancelled', 'task5_duplicate_proof', NULL);

INSERT INTO wp_bl_withdrawals
  (instructor_id, amount_minor, status, payout_reference, cancelled_at)
VALUES
  (@instructor_id, 1, 'cancelled', 'task5_duplicate_proof', NULL);

SELECT
  id,
  instructor_id,
  amount_minor,
  status,
  payout_reference,
  cancelled_at
FROM wp_bl_withdrawals
WHERE payout_reference = 'task5_duplicate_proof';
```

```
-- output
Query OK, 1 row affected (0.01 sec)

Query OK, 1 row affected (0.01 sec)

+----+---------------+--------------+-----------+-----------------------+--------------+
| id | instructor_id | amount_minor | status    | payout_reference      | cancelled_at |
+----+---------------+--------------+-----------+-----------------------+--------------+
|  1 |             2 |            1 | cancelled | task5_duplicate_proof | NULL         |
|  2 |             2 |            1 | cancelled | task5_duplicate_proof | NULL         |
+----+---------------+--------------+-----------+-----------------------+--------------+
2 rows in set (0.00 sec)
```

**Did the unique key prevent the duplicate? If not, exactly why?**
No. MySQL permits multiple NULL values in a unique index. Therefore, the old composite key (instructor_id, payout_reference, cancelled_at) allowed two rows with the same instructor and payout reference when both cancelled_at values were NULL.

### The fix — `database/migrations/002_fix_withdrawal_reference.sql`
ALTER TABLE wp_bl_withdrawals
  DROP INDEX uq_reference,
  ADD UNIQUE KEY uq_reference (instructor_id, payout_reference);
  
**Why a new migration rather than editing `001_initial.sql`:** (one line)
001_initial.sql was already applied, so editing it would not change an existing database and would rewrite migration history.

**Applying it:**
mysql: [Warning] Using a password on the command line interface can be insecure.
```
-- output of applying the migration
```

**`SHOW CREATE TABLE wp_bl_withdrawals;` afterwards:**

```
-- output
| wp_bl_withdrawals | CREATE TABLE `wp_bl_withdrawals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `instructor_id` bigint unsigned NOT NULL,
  `amount_minor` int unsigned NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'pending',
  `payout_reference` varchar(64) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reference` (`instructor_id`,`payout_reference`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci |
```

**The duplicate insert, re-run and now rejected:**

```
-- output
  Query OK, 1 row affected (0.01 sec)

ERROR 1062 (23000): Duplicate entry '2-task5_duplicate_proof' for key 'wp_bl_withdrawals.uq_reference'
```

## 5.3 The join

```sql
-- your query
SELECT
  c.title,
  COUNT(e.id) AS non_refunded_enrolment_count,
  COALESCE(SUM(e.amount_paid_minor), 0) AS non_refunded_revenue_minor
FROM wp_bl_courses AS c
LEFT JOIN wp_bl_enrolments AS e
  ON e.course_id = c.id
  AND e.refunded_at IS NULL
GROUP BY c.id, c.title
ORDER BY c.id;
```

```
-- output
+------------------------------+------------------------------+----------------------------+
| title                        | non_refunded_enrolment_count | non_refunded_revenue_minor |
+------------------------------+------------------------------+----------------------------+
| Introduction to Bread Baking |                            2 |                       9000 |
| Sourdough Starters           |                            0 |                          0 |
| Pastry Fundamentals          |                            0 |                          0 |
| Cake Decorating Basics       |                            0 |                          0 |
| Advanced Laminated Dough     |                            0 |                          0 |
+------------------------------+------------------------------+----------------------------+
5 rows in set (0.01 sec)
```

**Which join type did you use, and what would break with the other one?**
I used a LEFT JOIN so every course appears, including courses with zero non-refunded enrolments. An INNER JOIN would omit courses without matching enrolment rows.