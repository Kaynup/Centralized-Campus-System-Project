from apscheduler.schedulers.background import BackgroundScheduler
from .database import get_connection
import logging

logger = logging.getLogger(__name__)


def update_overdue_rentals():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                r.id,
                s.student_id,
                r.equipment_id
            FROM rental_records r
            JOIN students s
                ON r.student_id = s.id
            WHERE
                r.status = 'Borrowed'
                AND r.due_date < NOW()
        """)

        overdue_items = cursor.fetchall()

        if overdue_items:

            cursor.execute("""
                UPDATE rental_records
                SET status = 'Late'
                WHERE
                    status = 'Borrowed'
                    AND due_date < NOW()
            """)

            conn.commit()

            for item in overdue_items:
                logger.warning(
                    f"OVERDUE ITEM | "
                    f"student_id={item['student_id']} | "
                    f"item_id={item['equipment_id']} | "
                    f"status=Late"
                )

    except Exception as e:
        conn.rollback()
        logger.error(f"SCHEDULER ERROR | {str(e)}")

    finally:
        cursor.close()
        conn.close()


def start_scheduler():
    scheduler = BackgroundScheduler()

    scheduler.add_job(
        update_overdue_rentals,
        "interval",
        hours=1
    )

    scheduler.start()

    logger.info("Overdue rental scheduler started")
