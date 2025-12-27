import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, List, Dict, Any
import logging
from .config import settings

logger = logging.getLogger(__name__)


class Database:
    def __init__(self):
        self.dsn = settings.db_dsn
    
    @contextmanager
    def get_connection(self) -> Generator[psycopg2.extensions.connection, None, None]:
        conn = None
        try:
            conn = psycopg2.connect(self.dsn)
            yield conn
            # Only commit if connection is still open
            if conn and not conn.closed:
                conn.commit()
        except Exception as e:
            # Only rollback if connection is still open
            if conn and not conn.closed:
                try:
                    conn.rollback()
                except Exception as rollback_error:
                    logger.warning(f"Error during rollback: {rollback_error}")
            logger.error(f"Database error: {e}", exc_info=True)
            raise
        finally:
            # Only close if connection is still open
            if conn and not conn.closed:
                try:
                    conn.close()
                except Exception as close_error:
                    logger.warning(f"Error closing connection: {close_error}")
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return cur.fetchall()
    
    def execute_update(self, query: str, params: tuple = None) -> None:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if not conn.closed:
                    conn.commit()


db = Database()