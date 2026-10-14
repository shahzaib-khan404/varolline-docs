import { AdminAnalyticsView } from "@/components/features/admin/admin-analytics-view";

export const metadata = {
  title: "Traffic & Performance Analytics — Admin Portal | uLovepdf",
  description: "Live real-time monitoring of visitors, pageviews, document conversions, and registered users",
};

export default function AdminPage() {
  return <AdminAnalyticsView />;
}
