import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JobCard } from "@/components/JobCard";
import { type Job, type JobStatus, useJobs } from "@/context/JobsContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { jobs } = useJobs();
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [view, setView] = useState<"list" | "month">("list");
  const [cursorMonth, setCursorMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const sorted = useMemo(() => {
    const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
    return [...filtered].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [jobs, filter]);

  const upcoming = jobs.filter((j) => j.status === "scheduled").length;
  const inProgress = jobs.filter((j) => j.status === "in-progress").length;

  const jobsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of jobs) {
      const start = new Date(j.scheduledDate);
      const duration = Math.max(1, j.durationDays ?? 1);
      for (let offset = 0; offset < duration; offset++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
        const key = toDateKey(date);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [jobs]);

  const monthGrid = useMemo(() => {
    const year = cursorMonth.getFullYear();
    const month = cursorMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // Monday-first: getDay() returns 0=Sun..6=Sat. Convert to Mon=0..Sun=6.
    const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ key: string; date: Date | null; dateKey: string | null }> = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ key: `blank-${i}`, date: null, dateKey: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ key: `d-${d}`, date, dateKey: toDateKey(date) });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: `tail-${cells.length}`, date: null, dateKey: null });
    }
    return cells;
  }, [cursorMonth]);

  const selectedDayJobs = useMemo(
    () => [...jobs.filter((j) => {
      const start = new Date(j.scheduledDate);
      const duration = Math.max(1, j.durationDays ?? 1);
      const selected = new Date(selectedDate + "T00:00:00");
      return selected >= start && selected < new Date(start.getFullYear(), start.getMonth(), start.getDate() + duration);
    })].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [jobs, selectedDate],
  );

  const todayKey = toDateKey(new Date());

  const shiftMonth = (delta: number) => {
    const next = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() + delta, 1);
    setCursorMonth(next);
    const prevSelected = new Date(selectedDate + "T00:00:00");
    const daysInNext = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    const day = Math.min(prevSelected.getDate(), daysInNext);
    setSelectedDate(toDateKey(new Date(next.getFullYear(), next.getMonth(), day)));
  };
  const goPrevMonth = () => shiftMonth(-1);
  const goNextMonth = () => shiftMonth(1);
  const goToday = () => {
    const d = new Date();
    setCursorMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(toDateKey(d));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topArea, { paddingTop: topPadding + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/new-job")}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.viewToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, view === "list" && { backgroundColor: colors.primary }]}
            onPress={() => setView("list")}
            activeOpacity={0.8}
          >
            <Feather name="list" size={14} color={view === "list" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.viewToggleText, { color: view === "list" ? "#fff" : colors.mutedForeground }]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, view === "month" && { backgroundColor: colors.primary }]}
            onPress={() => setView("month")}
            activeOpacity={0.8}
          >
            <Feather name="calendar" size={14} color={view === "month" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.viewToggleText, { color: view === "month" ? "#fff" : colors.mutedForeground }]}>Month</Text>
          </TouchableOpacity>
        </View>

        {view === "list" && (upcoming > 0 || inProgress > 0) && (
          <View style={styles.summaryRow}>
            {upcoming > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="clock" size={13} color="#3B82F6" />
                <Text style={[styles.summaryText, { color: "#3B82F6" }]}>{upcoming} upcoming</Text>
              </View>
            )}
            {inProgress > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: "#FFFBEB" }]}>
                <Feather name="tool" size={13} color="#F59E0B" />
                <Text style={[styles.summaryText, { color: "#F59E0B" }]}>{inProgress} in progress</Text>
              </View>
            )}
          </View>
        )}

        {view === "list" && (
          <FlatList
            data={FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.value}
            contentContainerStyle={styles.filterList}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const active = filter === item.value;
              return (
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => setFilter(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, { color: active ? "#fff" : colors.mutedForeground }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {view === "list" ? (
        <FlatList
          data={sorted}
          keyExtractor={(j) => j.id}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No jobs scheduled</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to schedule your first job</Text>
            </View>
          }
          renderItem={({ item }) => <JobCard job={item} />}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.monthScroll, { paddingBottom: isWeb ? 34 : insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goPrevMonth} style={[styles.monthNavBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="chevron-left" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToday}>
              <Text style={[styles.monthTitle, { color: colors.text }]}>
                {MONTH_NAMES[cursorMonth.getMonth()]} {cursorMonth.getFullYear()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNextMonth} style={[styles.monthNavBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="chevron-right" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={[styles.weekdayText, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {monthGrid.map((cell) => {
              if (!cell.date || !cell.dateKey) {
                return <View key={cell.key} style={styles.calCell} />;
              }
              const isToday = cell.dateKey === todayKey;
              const isSelected = cell.dateKey === selectedDate;
              const count = jobsByDate.get(cell.dateKey) ?? 0;
              const hasJobs = count > 0;
              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.calCell,
                    {
                      backgroundColor: isSelected ? colors.primary : isToday ? colors.primary + "18" : "transparent",
                      borderColor: isToday && !isSelected ? colors.primary : "transparent",
                    },
                  ]}
                  onPress={() => setSelectedDate(cell.dateKey!)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calCellNum,
                      { color: isSelected ? "#fff" : isToday ? colors.primary : colors.text },
                    ]}
                  >
                    {cell.date.getDate()}
                  </Text>
                  {hasJobs && (
                    <View
                      style={[
                        styles.calDot,
                        { backgroundColor: isSelected ? "#fff" : colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dayHeader}>
            <Text style={[styles.dayHeaderText, { color: colors.text }]}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </Text>
            <Text style={[styles.dayHeaderCount, { color: colors.mutedForeground }]}>
              {selectedDayJobs.length} {selectedDayJobs.length === 1 ? "job" : "jobs"}
            </Text>
          </View>

          {selectedDayJobs.length === 0 ? (
            <View style={styles.dayEmpty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No jobs on this day</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {selectedDayJobs.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  newBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  viewToggle: { flexDirection: "row", borderRadius: 10, padding: 3, borderWidth: 1, alignSelf: "flex-start" },
  viewToggleBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  viewToggleText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  summaryText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  filterList: { gap: 8, paddingBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  monthScroll: { padding: 16, gap: 12 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  monthNavBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  monthTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  weekdayRow: { flexDirection: "row", paddingVertical: 4 },
  weekdayText: { flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, gap: 3 },
  calCellNum: { fontSize: 15, fontFamily: "Inter_500Medium" },
  calDot: { width: 5, height: 5, borderRadius: 3 },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  dayHeaderText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dayHeaderCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  dayEmpty: { paddingVertical: 24, alignItems: "center" },
  scheduleDateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, gap: 8, marginVertical: 8 },
  scheduleDateBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
