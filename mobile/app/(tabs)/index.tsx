// Dashboard screen - shows overview of community needs and volunteer stats
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { database } from "../../lib/database";
import { Q } from "@nozbe/watermelondb";
import { syncEngine } from "../../services/sync-engine";

interface DashboardStats {
  totalSurveys: number;
  pendingSync: number;
  openNeeds: number;
  activeVolunteers: number;
  completedTasks: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    pendingSync: 0,
    openNeeds: 0,
    activeVolunteers: 0,
    completedTasks: 0,
  });
  const [isOnline, setIsOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const [surveys, pendingSurveys, needs, volunteers, completed] =
        await Promise.all([
          database.get("surveys").query().fetchCount(),
          database
            .get("surveys")
            .query(Q.where("sync_status", "pending"))
            .fetchCount(),
          database
            .get("community_needs")
            .query(Q.where("status", "open"))
            .fetchCount(),
          database
            .get("volunteers")
            .query(Q.where("availability", true))
            .fetchCount(),
          database
            .get("task_assignments")
            .query(Q.where("status", "completed"))
            .fetchCount(),
        ]);

      setStats({
        totalSurveys: surveys,
        pendingSync: pendingSurveys,
        openNeeds: needs,
        activeVolunteers: volunteers,
        completedTasks: completed,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  useEffect(() => {
    loadStats();
    const unsubscribe = syncEngine.onConnectivityChange(setIsOnline);
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    if (isOnline) {
      await syncEngine.syncPendingSurveys();
    }
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Connectivity Banner */}
      <View
        style={[
          styles.banner,
          { backgroundColor: isOnline ? "#4CAF50" : "#FF9800" },
        ]}
      >
        <Text style={styles.bannerText}>
          {isOnline ? "🟢 Online - Data syncing" : "🔴 Offline - Data saved locally"}
        </Text>
        {stats.pendingSync > 0 && (
          <Text style={styles.bannerSubtext}>
            {stats.pendingSync} surveys pending sync
          </Text>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
          <Text style={styles.statNumber}>{stats.totalSurveys}</Text>
          <Text style={styles.statLabel}>Total Surveys</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
          <Text style={styles.statNumber}>{stats.openNeeds}</Text>
          <Text style={styles.statLabel}>Open Needs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
          <Text style={styles.statNumber}>{stats.activeVolunteers}</Text>
          <Text style={styles.statLabel}>Active Volunteers</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#F3E5F5" }]}>
          <Text style={styles.statNumber}>{stats.completedTasks}</Text>
          <Text style={styles.statLabel}>Tasks Completed</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/capture")}
        >
          <Text style={styles.actionButtonText}>📷 Capture New Survey</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#1565C0" }]}
          onPress={() => router.push("/(tabs)/map")}
        >
          <Text style={styles.actionButtonText}>
            🗺️ View Vulnerability Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* SDG Impact Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SDG Impact Areas</Text>
        {[
          { sdg: 1, name: "No Poverty", color: "#E5243B" },
          { sdg: 2, name: "Zero Hunger", color: "#DDA63A" },
          { sdg: 3, name: "Good Health", color: "#4C9F38" },
          { sdg: 4, name: "Quality Education", color: "#C5192D" },
          { sdg: 6, name: "Clean Water", color: "#26BDE2" },
        ].map((sdg) => (
          <View key={sdg.sdg} style={styles.sdgRow}>
            <View style={[styles.sdgBadge, { backgroundColor: sdg.color }]}>
              <Text style={styles.sdgBadgeText}>SDG {sdg.sdg}</Text>
            </View>
            <Text style={styles.sdgName}>{sdg.name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  banner: {
    padding: 16,
    alignItems: "center",
  },
  bannerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  bannerSubtext: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  statCard: {
    width: "46%",
    margin: "2%",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: "#1B5E20",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sdgRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sdgBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  sdgBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  sdgName: {
    fontSize: 16,
    color: "#333",
  },
});
