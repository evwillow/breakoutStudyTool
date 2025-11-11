"""
Google Analytics Data API Client

Fetches traffic and engagement metrics from Google Analytics 4.
"""

import os
from datetime import datetime, timedelta
from typing import Dict, Optional, List
import json

try:
    from google.analytics.data import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        RunReportRequest,
        DateRange,
        Dimension,
        Metric,
    )
    GA_AVAILABLE = True
except ImportError:
    GA_AVAILABLE = False
    # Create dummy types to avoid errors
    BetaAnalyticsDataClient = None
    RunReportRequest = None
    DateRange = None
    Dimension = None
    Metric = None


def get_ga_data(
    property_id: str,
    days: int = 30,
    credentials_path: Optional[str] = None
) -> Optional[Dict]:
    """
    Fetch Google Analytics data for the last N days.
    
    Args:
        property_id: GA4 Property ID (e.g., "123456789")
        days: Number of days to look back
        credentials_path: Path to service account JSON credentials
    
    Returns:
        Dictionary with GA metrics or None if unavailable
    """
    if not GA_AVAILABLE:
        return None
    
    if not property_id:
        return None
    
    try:
        # Initialize client
        if credentials_path and os.path.exists(credentials_path):
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
            client = BetaAnalyticsDataClient()
        else:
            # Try default credentials
            try:
                client = BetaAnalyticsDataClient()
            except Exception:
                return None
        
        # Date range
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Request overall metrics
        request = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            metrics=[
                Metric(name="totalUsers"),
                Metric(name="sessions"),
                Metric(name="screenPageViews"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration"),
                Metric(name="newUsers"),
            ],
        )
        
        response = client.run_report(request)
        
        if not response.row_count:
            return None
        
        # Extract metrics from first row
        row = response.rows[0]
        metrics = {}
        for i, metric_value in enumerate(row.metric_values):
            metric_name = request.metrics[i].name
            metrics[metric_name] = float(metric_value.value) if metric_value.value else 0
        
        # Get traffic sources
        source_request = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimensions=[Dimension(name="sessionSource")],
            metrics=[Metric(name="sessions"), Metric(name="totalUsers")],
            limit=10,
        )
        
        source_response = client.run_report(source_request)
        sources = []
        if source_response.row_count:
            for row in source_response.rows:
                source = row.dimension_values[0].value
                sessions = int(row.metric_values[0].value) if row.metric_values[0].value else 0
                users = int(row.metric_values[1].value) if row.metric_values[1].value else 0
                sources.append({
                    'source': source or 'direct',
                    'sessions': sessions,
                    'users': users
                })
        
        return {
            'total_users': int(metrics.get('totalUsers', 0)),
            'sessions': int(metrics.get('sessions', 0)),
            'page_views': int(metrics.get('screenPageViews', 0)),
            'bounce_rate': metrics.get('bounceRate', 0) * 100,  # Convert to percentage
            'avg_session_duration': metrics.get('averageSessionDuration', 0),
            'new_users': int(metrics.get('newUsers', 0)),
            'sources': sources,
            'period_days': days,
        }
    
    except Exception as e:
        print(f"Warning: Could not fetch Google Analytics data: {e}")
        return None


def extract_property_id(measurement_id: str) -> Optional[str]:
    """
    Extract GA4 Property ID from Measurement ID.
    Measurement ID format: G-XXXXXXXXXX
    We need the numeric Property ID.
    """
    # For GA4, we need the Property ID, not the Measurement ID
    # This would need to be configured separately or looked up
    # For now, return None and require explicit property_id
    return None

