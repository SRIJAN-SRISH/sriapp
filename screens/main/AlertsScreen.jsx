// Alerts — critical and catastrophic entries from system_logs.

import LogRow from "../../components/srijan/LogRow";
import { Screen } from "../../components/srijan/layout";
import { Banner, Card, EmptyState, LoadingBlock } from "../../components/srijan/ui";
import { useAuth } from "../../context/AuthContext";
import { useLoader } from "../../hooks/useLoader";
import { getSystemLogs } from "../../services/api/deviceService";

export default function AlertsScreen() {
  const { farmId } = useAuth();
  const { data, error, loading, refreshing, reload } = useLoader(
    () => getSystemLogs(farmId, { minSeverity: 3, limit: 80 }),
    farmId,
  );
  const logs = data || [];

  return (
    <Screen title="Alerts" subtitle="Critical device events" back refreshing={refreshing} onRefresh={reload}>
      {loading && !data ? (
        <LoadingBlock />
      ) : error && !data ? (
        <Banner message={error} action="Try again" onAction={reload} />
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState icon="bell-check-outline" title="All clear" message="No critical events have been reported." />
        </Card>
      ) : (
        <Card padded={false}>
          {logs.map((log, i) => (
            <LogRow key={log.id} log={log} last={i === logs.length - 1} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
