// Farm profile — agronomic constants from farm_profiles.

import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/srijan/layout";
import { Banner, Card, EmptyState, InfoRow, LoadingBlock, MoistureGauge, SectionHeader } from "../../components/srijan/ui";
import { C } from "../../constants/colors";
import { CROP, GROWTH_STAGE } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { useLoader } from "../../hooks/useLoader";
import { getFarmProfile } from "../../services/api/sensorService";
import { moistureModel } from "../../utils/agronomy";
import { fmt, formatDate } from "../../utils/format";

export default function FarmOverviewScreen() {
  const { farmId } = useAuth();
  const { data: farm, error, loading, refreshing, reload } = useLoader(() => getFarmProfile(farmId), farmId);
  const model = moistureModel(farm);
  const tawMm = farm && model ? ((model.fc - model.wp) / 100) * farm.root_depth_m * 1000 : null;

  return (
    <Screen title="Farm profile" subtitle={farmId} back refreshing={refreshing} onRefresh={reload}>
      {loading && !farm ? (
        <LoadingBlock />
      ) : error && !farm ? (
        <Banner message={error} action="Try again" onAction={reload} />
      ) : !farm ? (
        <Card>
          <EmptyState icon="barn" title="Farm not found" message={`No farm_profiles row exists for ${farmId}.`} />
        </Card>
      ) : (
        <>
          <Card>
            <InfoRow icon="barn" label="Farm ID" value={farm.farm_id} />
            <InfoRow icon="texture-box" label="Field" value={farm.field_id} />
            <InfoRow icon="router-wireless" label="Gateway node" value={farm.node_id} />
            <InfoRow icon="sprout" label="Crop category" value={CROP[farm.crop_id] ?? `Code ${farm.crop_id}`} />
            <InfoRow icon="chart-timeline-variant" label="Growth stage" value={GROWTH_STAGE[farm.growth_stage] ?? `Code ${farm.growth_stage}`} />
            <InfoRow icon="ruler-square" label="Field area" value={`${fmt(farm.field_area_m2, 0)} m²  (${fmt(farm.field_area_m2 / 4046.86, 2)} acre)`} />
            <InfoRow icon="arrow-collapse-down" label="Root depth" value={`${fmt(farm.root_depth_m, 2)} m`} last />
          </Card>

          <SectionHeader title="Soil water limits" style={{ marginTop: 20 }} />
          <Card>
            {model ? <MoistureGauge vwc={null} {...model} /> : null}
            <InfoRow label="Field capacity" value={`${fmt(farm.field_capacity_vwc)} % VWC`} />
            <InfoRow label="Wilting point" value={`${fmt(farm.wilting_point_vwc)} % VWC`} />
            <InfoRow label="Allowed depletion (MAD)" value={`${fmt(farm.mad_percent, 0)} %`} />
            <InfoRow label="Refill point" value={model ? `${fmt(model.refill)} % VWC` : "—"} />
            <InfoRow label="Total available water" value={tawMm !== null ? `${fmt(tawMm, 0)} mm` : "—"} last />
          </Card>

          <SectionHeader title="Irrigation limits" style={{ marginTop: 20 }} />
          <Card>
            <InfoRow icon="percent-outline" label="System efficiency" value={`${fmt(farm.irrigation_efficiency, 0)} %`} />
            <InfoRow icon="water" label="Max per run" value={`${fmt(farm.max_dose_l, 0)} L`} />
            <InfoRow icon="calendar-today" label="Max per day" value={`${fmt(farm.max_daily_l, 0)} L`} />
            <InfoRow icon="weather-pouring" label="Rain lock above" value={`${fmt(farm.rain_lock_mm)} mm`} />
            <InfoRow icon="timer-sand" label="Settle time after watering" value={`${farm.stab_delay_min} min`} />
            <InfoRow icon="map-marker-radius-outline" label="Default zone" value={farm.default_zone_id} last />
          </Card>

          <View style={s.foot}>
            <Text style={s.footTxt}>
              Profile v{farm.profile_version} · updated {formatDate(new Date(farm.updated_at))}
            </Text>
            <Text style={s.footTxt}>These values are set on Node B / in Supabase and drive the AI decisions.</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  foot: { marginTop: 14, alignItems: "center", gap: 3 },
  footTxt: { fontSize: 11.5, color: C.textFaint, textAlign: "center" },
});
