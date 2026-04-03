// Volunteer detail screen showing social resume and assigned tasks
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { database } from "../../lib/database";
import { Volunteer, ImpactToken, TaskAssignment } from "../../models";
import { Q } from "@nozbe/watermelondb";

export default function VolunteerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [tokens, setTokens] = useState<ImpactToken[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);

  useEffect(() => {
    if (!id) return;
    loadVolunteerData(id);
  }, [id]);

  const loadVolunteerData = async (volunteerId: string) => {
    try {
      const vol = await database.get<Volunteer>("volunteers").find(volunteerId);
      setVolunteer(vol);

      const [volunteerTokens, volunteerAssignments] = await Promise.all([
        database
          .get<ImpactToken>("impact_tokens")
          .query(Q.where("volunteer_id", volunteerId))
          .fetch(),
        database
          .get<TaskAssignment>("task_assignments")
          .query(Q.where("volunteer_id", volunteerId))
          .fetch(),
      ]);

      setTokens(volunteerTokens);
      setAssignments(volunteerAssignments);
    } catch (error) {
      console.error("Failed to load volunteer:", error);
    }
  };

  if (!volunteer) {
    return (
      <View style={styles.loading}>
        <Text>Loading volunteer profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{volunteer.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{volunteer.name}</Text>
        {volunteer.did && (
          <Text style={styles.did} numberOfLines={1}>🔐 {volunteer.did}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsRow}>
          {volunteer.skills.map((skill: string, i: number) => (
            <View key={i} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Impact Tokens ({tokens.length})
        </Text>
        {tokens.map((token) => (
          <View key={token.id} style={styles.tokenCard}>
            <Text style={styles.tokenTitle}>🎖️ {token.sdgCategory}</Text>
            <Text style={styles.tokenDesc}>{token.impactDescription}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Task History ({assignments.length})
        </Text>
        {assignments.map((assignment) => (
          <View key={assignment.id} style={styles.assignmentCard}>
            <Text style={styles.assignmentStatus}>
              {assignment.status.toUpperCase()}
            </Text>
            <Text style={styles.assignmentScore}>
              Match Score: {(assignment.similarityScore * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#1B5E20",
    padding: 24,
    alignItems: "center",
    paddingTop: 40,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 32, color: "#fff", fontWeight: "bold" },
  name: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  did: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 12 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { backgroundColor: "#E8F5E9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  skillText: { fontSize: 14, color: "#1B5E20" },
  tokenCard: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1 },
  tokenTitle: { fontSize: 15, fontWeight: "bold", color: "#333" },
  tokenDesc: { fontSize: 13, color: "#666", marginTop: 4 },
  assignmentCard: {
    backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 8,
    flexDirection: "row", justifyContent: "space-between", elevation: 1,
  },
  assignmentStatus: { fontSize: 14, fontWeight: "bold", color: "#1B5E20" },
  assignmentScore: { fontSize: 14, color: "#666" },
});
