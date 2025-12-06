"""
Offline Evaluation Script for Job Recommendation System

This script evaluates the recommendation system using historical interaction data.
It calculates standard recommendation metrics:
- Precision@K
- Recall@K
- NDCG@K (Normalized Discounted Cumulative Gain)
- MAP (Mean Average Precision)
- Hit Rate
- Coverage
- Diversity
- Popularity Bias

Usage:
    python scripts/evaluate_recommendations.py
"""
import sys
import os
import numpy as np
from typing import Dict, List, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict
import json
import logging

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.database import db
from src.services.recommendation_service import recommendation_service
from src.models.schemas import RecommendationRequest, UserPreferences
from src.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class RecommendationEvaluator:
    """Offline evaluation for recommendation system"""
    
    def __init__(self, test_split_date: str = None, min_interactions_per_user: int = 5):
        """
        Args:
            test_split_date: Date string (YYYY-MM-DD) to split train/test. 
                           If None, uses 80/20 split by date.
            min_interactions_per_user: Minimum interactions required for a user to be included
        """
        self.test_split_date = test_split_date
        self.min_interactions_per_user = min_interactions_per_user
        self.train_interactions = {}  # {user_id: {job_id: weight}}
        self.test_interactions = {}   # {user_id: {job_id: weight}}
        self.all_jobs = set()
        
    def load_interactions(self) -> None:
        """Load and split interactions into train/test sets"""
        logger.info("Loading interactions from database...")
        
        query = """
            SELECT 
                "userId",
                "jobId",
                type,
                weight,
                "createdAt"
            FROM job_interactions
            WHERE "createdAt" IS NOT NULL
            ORDER BY "createdAt" ASC
        """
        
        try:
            results = db.execute_query(query)
            logger.info(f"Loaded {len(results)} total interactions")
            
            # Group by user
            user_interactions = defaultdict(list)
            for row in results:
                user_id = str(row['userId'])
                job_id = str(row['jobId'])
                interaction_type = row['type']
                weight = float(row['weight']) if row['weight'] else 1.0
                created_at = row['createdAt']
                
                user_interactions[user_id].append({
                    'jobId': job_id,
                    'type': interaction_type,
                    'weight': weight,
                    'createdAt': created_at
                })
                self.all_jobs.add(job_id)
            
            # Filter users with minimum interactions
            valid_users = {
                uid: interactions 
                for uid, interactions in user_interactions.items()
                if len(interactions) >= self.min_interactions_per_user
            }
            
            logger.info(f"Found {len(valid_users)} users with >= {self.min_interactions_per_user} interactions")
            
            # Determine split date
            if self.test_split_date:
                split_date = datetime.strptime(self.test_split_date, "%Y-%m-%d")
            else:
                # Use 80/20 split by date
                all_dates = sorted([i['createdAt'] for interactions in valid_users.values() for i in interactions])
                split_idx = int(len(all_dates) * 0.8)
                split_date = all_dates[split_idx] if all_dates else datetime.now() - timedelta(days=30)
            
            logger.info(f"Splitting data at: {split_date}")
            
            # Split into train/test
            for user_id, interactions in valid_users.items():
                train = {}
                test = {}
                
                for interaction in interactions:
                    job_id = interaction['jobId']
                    weight = interaction['weight']
                    created_at = interaction['createdAt']
                    
                    if created_at < split_date:
                        # Training data
                        if job_id in train:
                            train[job_id] = max(train[job_id], weight)  # Take max weight
                        else:
                            train[job_id] = weight
                    else:
                        # Test data
                        if job_id in test:
                            test[job_id] = max(test[job_id], weight)
                        else:
                            test[job_id] = weight
                
                # Only include users with both train and test data
                if train and test:
                    self.train_interactions[user_id] = train
                    self.test_interactions[user_id] = test
            
            logger.info(f"Train set: {len(self.train_interactions)} users")
            logger.info(f"Test set: {len(self.test_interactions)} users")
            logger.info(f"Total unique jobs: {len(self.all_jobs)}")
            
        except Exception as e:
            logger.error(f"Error loading interactions: {e}", exc_info=True)
            raise
    
    def precision_at_k(self, recommended: List[str], relevant: Set[str], k: int) -> float:
        """Calculate Precision@K"""
        if k == 0:
            return 0.0
        top_k = recommended[:k]
        relevant_in_top_k = len(set(top_k) & relevant)
        return relevant_in_top_k / k
    
    def recall_at_k(self, recommended: List[str], relevant: Set[str], k: int) -> float:
        """Calculate Recall@K"""
        if len(relevant) == 0:
            return 0.0
        top_k = recommended[:k]
        relevant_in_top_k = len(set(top_k) & relevant)
        return relevant_in_top_k / len(relevant)
    
    def ndcg_at_k(self, recommended: List[str], relevant: Set[str], k: int) -> float:
        """Calculate NDCG@K (Normalized Discounted Cumulative Gain)"""
        if len(relevant) == 0:
            return 0.0
        
        top_k = recommended[:k]
        dcg = 0.0
        for i, job_id in enumerate(top_k):
            if job_id in relevant:
                dcg += 1.0 / np.log2(i + 2)  # i+2 because log2(1) = 0
        
        # Ideal DCG
        ideal_dcg = sum(1.0 / np.log2(i + 2) for i in range(min(k, len(relevant))))
        
        return dcg / ideal_dcg if ideal_dcg > 0 else 0.0
    
    def average_precision(self, recommended: List[str], relevant: Set[str]) -> float:
        """Calculate Average Precision (AP)"""
        if len(relevant) == 0:
            return 0.0
        
        relevant_count = 0
        precision_sum = 0.0
        
        for i, job_id in enumerate(recommended):
            if job_id in relevant:
                relevant_count += 1
                precision_sum += relevant_count / (i + 1)
        
        return precision_sum / len(relevant) if len(relevant) > 0 else 0.0
    
    def hit_rate(self, recommended: List[str], relevant: Set[str], k: int) -> float:
        """Calculate Hit Rate@K (1 if any relevant item in top K, else 0)"""
        top_k = recommended[:k]
        return 1.0 if len(set(top_k) & relevant) > 0 else 0.0
    
    def coverage(self, all_recommendations: Dict[str, List[str]], all_jobs: Set[str]) -> float:
        """Calculate Coverage (fraction of items that can be recommended)"""
        recommended_jobs = set()
        for recommendations in all_recommendations.values():
            recommended_jobs.update(recommendations)
        
        return len(recommended_jobs) / len(all_jobs) if len(all_jobs) > 0 else 0.0
    
    def diversity(self, recommendations: List[str]) -> float:
        """Calculate Diversity (average pairwise distance between recommended items)
        Simplified: uses job category/industry diversity if available
        For now, returns 1.0 - (duplicate ratio)
        """
        unique_count = len(set(recommendations))
        return unique_count / len(recommendations) if recommendations else 0.0
    
    def popularity_bias(self, recommendations: List[str], job_popularity: Dict[str, int]) -> float:
        """Calculate Popularity Bias (average popularity of recommended items)"""
        if not recommendations or not job_popularity:
            return 0.0
        
        popularities = [job_popularity.get(job_id, 0) for job_id in recommendations]
        return np.mean(popularities) if popularities else 0.0
    
    def evaluate(self, k_values: List[int] = [5, 10, 20]) -> Dict:
        """Run full evaluation"""
        logger.info("Starting evaluation...")
        
        # Load interactions
        self.load_interactions()
        
        if not self.test_interactions:
            logger.error("No test interactions found. Cannot evaluate.")
            return {}
        
        # Calculate job popularity (for bias metric)
        job_popularity = defaultdict(int)
        for interactions in self.train_interactions.values():
            for job_id in interactions.keys():
                job_popularity[job_id] += 1
        
        # Generate recommendations for each user
        all_recommendations = {}
        metrics = {
            'precision': {k: [] for k in k_values},
            'recall': {k: [] for k in k_values},
            'ndcg': {k: [] for k in k_values},
            'map': [],
            'hit_rate': {k: [] for k in k_values},
            'diversity': [],
        }
        
        logger.info(f"Generating recommendations for {len(self.test_interactions)} users...")
        
        for i, (user_id, test_relevant) in enumerate(self.test_interactions.items()):
            if (i + 1) % 10 == 0:
                logger.info(f"Processed {i + 1}/{len(self.test_interactions)} users...")
            
            try:
                # Generate recommendations
                request = RecommendationRequest(
                    userId=user_id,
                    limit=max(k_values)
                )
                
                recommended_job_ids, scores = recommendation_service.get_recommendations(request)
                
                if not recommended_job_ids:
                    continue
                
                all_recommendations[user_id] = recommended_job_ids
                test_relevant_set = set(test_relevant.keys())
                
                # Calculate metrics
                for k in k_values:
                    metrics['precision'][k].append(
                        self.precision_at_k(recommended_job_ids, test_relevant_set, k)
                    )
                    metrics['recall'][k].append(
                        self.recall_at_k(recommended_job_ids, test_relevant_set, k)
                    )
                    metrics['ndcg'][k].append(
                        self.ndcg_at_k(recommended_job_ids, test_relevant_set, k)
                    )
                    metrics['hit_rate'][k].append(
                        self.hit_rate(recommended_job_ids, test_relevant_set, k)
                    )
                
                metrics['map'].append(
                    self.average_precision(recommended_job_ids, test_relevant_set)
                )
                
                metrics['diversity'].append(
                    self.diversity(recommended_job_ids)
                )
                
            except Exception as e:
                logger.warning(f"Error generating recommendations for user {user_id}: {e}")
                continue
        
        # Calculate aggregate metrics
        results = {
            'num_users': len(all_recommendations),
            'num_test_interactions': sum(len(interactions) for interactions in self.test_interactions.values()),
            'metrics': {}
        }
        
        for k in k_values:
            results['metrics'][f'precision@{k}'] = {
                'mean': np.mean(metrics['precision'][k]),
                'std': np.std(metrics['precision'][k]),
                'median': np.median(metrics['precision'][k])
            }
            results['metrics'][f'recall@{k}'] = {
                'mean': np.mean(metrics['recall'][k]),
                'std': np.std(metrics['recall'][k]),
                'median': np.median(metrics['recall'][k])
            }
            results['metrics'][f'ndcg@{k}'] = {
                'mean': np.mean(metrics['ndcg'][k]),
                'std': np.std(metrics['ndcg'][k]),
                'median': np.median(metrics['ndcg'][k])
            }
            results['metrics'][f'hit_rate@{k}'] = {
                'mean': np.mean(metrics['hit_rate'][k]),
                'std': np.std(metrics['hit_rate'][k]),
                'median': np.median(metrics['hit_rate'][k])
            }
        
        results['metrics']['map'] = {
            'mean': np.mean(metrics['map']),
            'std': np.std(metrics['map']),
            'median': np.median(metrics['map'])
        }
        
        results['metrics']['diversity'] = {
            'mean': np.mean(metrics['diversity']),
            'std': np.std(metrics['diversity']),
            'median': np.median(metrics['diversity'])
        }
        
        # Coverage
        results['metrics']['coverage'] = {
            'value': self.coverage(all_recommendations, self.all_jobs)
        }
        
        # Popularity bias
        all_recs_flat = [job_id for recs in all_recommendations.values() for job_id in recs]
        results['metrics']['popularity_bias'] = {
            'mean_popularity': self.popularity_bias(all_recs_flat, job_popularity)
        }
        
        return results
    
    def print_results(self, results: Dict) -> None:
        """Print evaluation results in a readable format"""
        print("\n" + "="*80)
        print("RECOMMENDATION SYSTEM EVALUATION RESULTS")
        print("="*80)
        print(f"\nUsers evaluated: {results['num_users']}")
        print(f"Test interactions: {results['num_test_interactions']}")
        print("\n" + "-"*80)
        print("METRICS")
        print("-"*80)
        
        for metric_name, metric_data in results['metrics'].items():
            if 'mean' in metric_data:
                print(f"\n{metric_name.upper()}:")
                print(f"  Mean:   {metric_data['mean']:.4f}")
                print(f"  Std:    {metric_data['std']:.4f}")
                print(f"  Median: {metric_data['median']:.4f}")
            else:
                print(f"\n{metric_name.upper()}:")
                print(f"  Value:  {metric_data.get('value', metric_data.get('mean_popularity', 0)):.4f}")
        
        print("\n" + "="*80)


def main():
    """Main evaluation function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluate recommendation system offline')
    parser.add_argument('--test-split-date', type=str, default=None,
                       help='Date to split train/test (YYYY-MM-DD). Default: 80/20 split')
    parser.add_argument('--min-interactions', type=int, default=5,
                       help='Minimum interactions per user (default: 5)')
    parser.add_argument('--k-values', type=int, nargs='+', default=[5, 10, 20],
                       help='K values for metrics (default: 5 10 20)')
    parser.add_argument('--output', type=str, default=None,
                       help='Output file to save results (JSON)')
    
    args = parser.parse_args()
    
    evaluator = RecommendationEvaluator(
        test_split_date=args.test_split_date,
        min_interactions_per_user=args.min_interactions
    )
    
    results = evaluator.evaluate(k_values=args.k_values)
    
    if results:
        evaluator.print_results(results)
        
        # Save to file if specified
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Results saved to {args.output}")
    else:
        logger.error("Evaluation failed or returned no results")


if __name__ == "__main__":
    main()