
from psycopg2.extras import RealDictCursor

def fetch_companies(conn):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, name FROM winai.companies")
        return cur.fetchall()

def fetch_company_data(conn, company_id):
    data = {}
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # 1. Fetch Leads Summary (Last 7 days)
        cur.execute("""
            SELECT status, COUNT(*) as count 
            FROM winai.leads 
            WHERE company_id = %s 
            AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY status
        """, (company_id,))
        data['leads_summary'] = cur.fetchall()

        # 2. Fetch Stalling Leads (New/Qualified, > 2 hours no update)
        cur.execute("""
            SELECT COUNT(*) as count
            FROM winai.leads
            WHERE company_id = %s
            AND status IN ('NEW', 'QUALIFIED')
            AND updated_at <= NOW() - INTERVAL '2 hours'
        """, (company_id,))
        result = cur.fetchone()
        data['stalling_leads'] = result['count'] if result else 0

        # 3. Fetch Active Campaigns
        cur.execute("""
            SELECT "name", status, objective, start_time
            FROM winai.meta_campaigns
            WHERE company_id = %s AND status = 'ACTIVE'
            LIMIT 5
        """, (company_id,))
        data['campaigns'] = cur.fetchall()

        # 4. Fetch Instagram Metrics (Last 7 days)
        cur.execute("""
            SELECT "date", impressions, reach, engagement_rate, follower_count
            FROM winai.instagram_metrics
            WHERE company_id = %s
            AND "date" >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY "date" DESC
        """, (company_id,))
        data['instagram_metrics'] = cur.fetchall()
        
    return data

def save_insights(conn, company_id, insights):
    with conn.cursor() as cur:
        for insight in insights:
            cur.execute("""
                INSERT INTO winai.ai_insights 
                (company_id, title, description, insight_type, priority, suggestion_source, action_url, action_label, is_read, is_dismissed, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, false, false, NOW())
            """, (
                company_id,
                insight['title'],
                insight['description'],
                insight['insightType'],
                insight['priority'],
                insight['suggestionSource'],
                insight['actionUrl'],
                insight['actionLabel']
            ))
        conn.commit()
