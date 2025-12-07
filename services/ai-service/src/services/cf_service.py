import numpy as np
import logging
from typing import Optional
import json
from ..database import db

logger = logging.getLogger(__name__)


class CollaborativeFilteringService:
    def __init__(self):
        pass
    
    def get_job_cf_factors(self, job_id: str) -> Optional[np.ndarray]:
        """Get job CF factors from database"""
        try:
            query = """
                SELECT factors
                FROM job_cf_factors
                WHERE "jobId" = %s
            """
            results = db.execute_query(query, (job_id,))
            if results and results[0]['factors']:
                factors_data = results[0]['factors']
                if isinstance(factors_data, list):
                    factors_list = factors_data
                elif isinstance(factors_data, str):
                    factors_list = json.loads(factors_data)
                else:
                    factors_list = factors_data
                return np.array(factors_list, dtype=np.float32)
            return None
        except Exception as e:
            logger.error(f"Error getting job CF factors for {job_id}: {e}", exc_info=True)
            return None
    
    def get_user_cf_factors(self, user_id: str) -> Optional[np.ndarray]:
        """Get user CF factors from database"""
        try:
            query = """
                SELECT factors
                FROM user_cf_factors
                WHERE "userId" = %s
            """
            results = db.execute_query(query, (user_id,))  # Fixed: was 'result'
            if results and results[0]['factors']:
                factors_data = results[0]['factors']
                if isinstance(factors_data, list):
                    factors_list = factors_data
                elif isinstance(factors_data, str):
                    factors_list = json.loads(factors_data)
                else:
                    factors_list = factors_data
                return np.array(factors_list, dtype=np.float32)
            return None
        except Exception as e:
            logger.error(f"Error getting user CF factors for {user_id}: {e}")
            return None
    
    def dot_product(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute dot product for CF scoring"""
        if vec1 is None or vec2 is None:
            return 0.0
        try:
            result = float(np.dot(vec1, vec2))
            # Normalize to 0-1 range (rough approximation)
            return max(0.0, min(1.0, (result + 1) / 2))
        except Exception as e:
            logger.error(f"Error computing dot product: {e}")
            return 0.0


cf_service = CollaborativeFilteringService()