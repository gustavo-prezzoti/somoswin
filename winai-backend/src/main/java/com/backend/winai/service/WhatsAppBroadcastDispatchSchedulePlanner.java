package com.backend.winai.service;

import com.backend.winai.entity.WhatsAppBroadcastDispatch;
import com.backend.winai.entity.WhatsAppBroadcastRecipient;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Distribui envios: 3–7 contatos distintos por dia civil, no máximo um envio por destinatário por dia,
 * horários aleatórios entre início e fim da janela (ex.: 9h–18h) no fuso informado.
 */
public final class WhatsAppBroadcastDispatchSchedulePlanner {

    private WhatsAppBroadcastDispatchSchedulePlanner() {}

    public static void assignScheduledTimes(
            List<WhatsAppBroadcastRecipient> recipients,
            Map<UUID, List<WhatsAppBroadcastDispatch>> dispatchesByRecipientId,
            ZonedDateTime campaignStartedAt,
            int dailyMinContacts,
            int dailyMaxContacts,
            int windowStartHour,
            int windowEndHour) {

        if (recipients.isEmpty()) {
            return;
        }
        java.time.ZoneId zone = campaignStartedAt.getZone();
        LocalDate firstDay = campaignStartedAt.toLocalDate();
        LocalDate today = ZonedDateTime.now(zone).toLocalDate();
        LocalDate cursorDay = firstDay.isBefore(today) ? today : firstDay;

        List<WhatsAppBroadcastRecipient> order = new ArrayList<>(recipients);
        Collections.shuffle(order, ThreadLocalRandom.current());

        Map<UUID, Deque<WhatsAppBroadcastDispatch>> queues = new HashMap<>();
        for (WhatsAppBroadcastRecipient r : recipients) {
            List<WhatsAppBroadcastDispatch> list =
                    new ArrayList<>(dispatchesByRecipientId.getOrDefault(r.getId(), List.of()));
            list.sort((a, b) -> Integer.compare(a.getSequenceIndex(), b.getSequenceIndex()));
            queues.put(r.getId(), new ArrayDeque<>(list));
        }

        while (hasAnyPendingSchedule(queues)) {
            if (!dayHasAssignableSlot(cursorDay, zone, windowStartHour, windowEndHour)) {
                cursorDay = cursorDay.plusDays(1);
                continue;
            }

            int k = ThreadLocalRandom.current().nextInt(dailyMinContacts, dailyMaxContacts + 1);
            List<WhatsAppBroadcastRecipient> pool = new ArrayList<>();
            for (WhatsAppBroadcastRecipient r : order) {
                Deque<WhatsAppBroadcastDispatch> q = queues.get(r.getId());
                if (q != null && !q.isEmpty()) {
                    pool.add(r);
                }
            }
            Collections.shuffle(pool, ThreadLocalRandom.current());
            int take = Math.min(k, pool.size());
            final LocalDate schedulingDay = cursorDay;
            for (int i = 0; i < take; i++) {
                WhatsAppBroadcastRecipient r = pool.get(i);
                Deque<WhatsAppBroadcastDispatch> q = queues.get(r.getId());
                WhatsAppBroadcastDispatch d = q.pollFirst();
                if (d != null) {
                    ZonedDateTime slot = randomSlotInDay(schedulingDay, zone, windowStartHour, windowEndHour)
                            .orElseGet(() -> schedulingDay.atStartOfDay(zone).withHour(windowStartHour));
                    d.setScheduledSendAt(slot);
                }
            }
            cursorDay = cursorDay.plusDays(1);
        }
    }

    private static boolean dayHasAssignableSlot(
            LocalDate day, java.time.ZoneId zone, int windowStartHour, int windowEndHour) {
        ZonedDateTime dayStart = day.atStartOfDay(zone);
        ZonedDateTime winStart = dayStart.withHour(windowStartHour).truncatedTo(ChronoUnit.MINUTES);
        ZonedDateTime winEnd = dayStart.withHour(windowEndHour).truncatedTo(ChronoUnit.MINUTES);
        ZonedDateTime effectiveStart = winStart;
        ZonedDateTime now = ZonedDateTime.now(zone);
        if (day.equals(now.toLocalDate()) && now.isAfter(effectiveStart)) {
            effectiveStart = now.truncatedTo(ChronoUnit.SECONDS);
        }
        return effectiveStart.isBefore(winEnd);
    }

    private static boolean hasAnyPendingSchedule(Map<UUID, Deque<WhatsAppBroadcastDispatch>> queues) {
        for (Deque<WhatsAppBroadcastDispatch> q : queues.values()) {
            if (!q.isEmpty()) {
                return true;
            }
        }
        return false;
    }

    private static Optional<ZonedDateTime> randomSlotInDay(
            LocalDate day, java.time.ZoneId zone, int windowStartHour, int windowEndHour) {
        ZonedDateTime dayStart = day.atStartOfDay(zone);
        ZonedDateTime winStart = dayStart.withHour(windowStartHour).truncatedTo(ChronoUnit.MINUTES);
        ZonedDateTime winEnd = dayStart.withHour(windowEndHour).truncatedTo(ChronoUnit.MINUTES);
        ZonedDateTime effectiveStart = winStart;
        ZonedDateTime now = ZonedDateTime.now(zone);
        if (day.equals(now.toLocalDate()) && now.isAfter(effectiveStart)) {
            effectiveStart = now.truncatedTo(ChronoUnit.SECONDS);
        }
        if (!effectiveStart.isBefore(winEnd)) {
            return Optional.empty();
        }
        long seconds = Duration.between(effectiveStart, winEnd).getSeconds();
        if (seconds <= 0) {
            return Optional.of(effectiveStart);
        }
        long offset = ThreadLocalRandom.current().nextLong(0, seconds + 1);
        return Optional.of(effectiveStart.plusSeconds(offset));
    }
}
