// Volunteer profile screen with DID, Social Resume, and Impact Tokens
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { database } from "../../lib/database";
import { Volunteer, ImpactToken } from "../../models";
import { createVolunteerDID, getSocialResume } from "../../services/blockchain";

export default function ProfileScreen() {
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [tokens, setTokens] = useState<ImpactToken[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const volunteers = await database
        .get<Volunteer>("volunteers")
        .query()
        .fetch();
      if (volunteers.length > 0) {
        setVolunteer(volunteers[0]);
        // Load impact tokens for this volunteer
        const volunteerTokens = await database
          .get<ImpactToken>("impact_tokens")
          .query()
          .fetch();
        setTokens(volunteerTokens);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  const handleConnectWallet = async () => {
    setLoading(true);
    try {
      const did = await createVolunteerDID();
      Alert.alert(
        "Wallet Connected",
        `Your DID: ${did.did}\n\nThis is your decentralized digital identity for GraminSync.`
      );
      // Update or create volunteer record with DID
      await database.write(async () => {
        if (volunteer) {
          await volunteer.update((v) => {
            v.did = did.did;
            v.walletAddress = did.walletAddress;
          });
        } else {
          await database.get<Volunteer>("volunteers").create((v) => {
            v.name = "Field Worker";
            v.did = did.did;
            v.walletAddress = did.walletAddress;
            v.skills = JSON.stringify([]) as unknown as string[];
            v.totalTasksCompleted = 0;
            v.burnoutScore = 0;
            v.availability = true;
          });
        }
      });
      await loadProfile();
    } catch (error) {
      Alert.alert("Connection Failed", "Could not connect to Solana wallet.");
      console.error("Wallet connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {volunteer?.name?.charAt(0) ?? "?"}
          </Text>
        </View>
        <Text style={styles.name}>{volunteer?.name ?? "Not Registered"}</Text>
        {volunteer?.did && (
          <Text style={styles.did} numberOfLines={1}>
            🔐 {volunteer.did}
          </Text>
        )}
      </View>

      {/* Stats */}
      {volunteer && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {volunteer.totalTasksCompleted}
            </Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tokens.length}</Text>
            <Text style={styles.statLabel}>Impact Tokens</Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    volunteer.burnoutScore > 60 ? "#D32F2F" : "#4CAF50",
                },
              ]}
            >
              {volunteer.burnoutScore}%
            </Text>
            <Text style={styles.statLabel}>Burnout Risk</Text>
          </View>
        </View>
      )}

      {/* Wallet Connection */}
      {!volunteer?.walletAddress && (
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnectWallet}
          disabled={loading}
        >
          <Text style={styles.connectButtonText}>
            {loading ? "Connecting..." : "🔗 Connect Solana Wallet"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Social Impact Resume */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🏆 Social Impact Resume (SITs)
        </Text>
        {tokens.length === 0 ? (
          <View style={styles.emptyTokens}>
            <Text style={styles.emptyText}>
              Complete verified tasks to earn non-transferable Impact Tokens
            </Text>
          </View>
        ) : (
          tokens.map((token) => (
            <View key={token.id} style={styles.tokenCard}>
              <View style={styles.tokenHeader}>
                <Text style={styles.tokenBadge}>
                  🎖️ {token.sdgCategory}
                </Text>
                {token.verified && (
                  <Text style={styles.verifiedBadge}>✅ Verified</Text>
                )}
              </View>
              <Text style={styles.tokenDescription}>
                {token.impactDescription}
              </Text>
              {token.tokenMint && (
                <Text style={styles.tokenMint} numberOfLines={1}>
                  Mint: {token.tokenMint}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Skills */}
      {volunteer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Skills</Text>
          <View style={styles.skillsGrid}>
            {(volunteer.skills ?? []).map((skill: string, index: number) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {(volunteer.skills ?? []).length === 0 && (
              <Text style={styles.emptyText}>No skills added yet</Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#1B5E20",
    padding: 24,
    alignItems: "center",
    paddingTop: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, color: "#fff", fontWeight: "bold" },
  name: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  did: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    justifyContent: "space-around",
    elevation: 2,
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#333" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  connectButton: {
    backgroundColor: "#7C4DFF",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  connectButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  emptyTokens: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center" },
  tokenCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tokenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tokenBadge: { fontSize: 14, fontWeight: "bold", color: "#333" },
  verifiedBadge: { fontSize: 12, color: "#4CAF50" },
  tokenDescription: { fontSize: 14, color: "#555" },
  tokenMint: { fontSize: 10, color: "#999", marginTop: 8 },
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skillChip: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: { fontSize: 14, color: "#1B5E20" },
});
