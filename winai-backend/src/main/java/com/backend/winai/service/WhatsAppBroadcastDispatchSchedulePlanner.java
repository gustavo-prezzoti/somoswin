package com.backend.winai.service;

import com.backend.winai.entity.WhatsAppBroadcastDispatch;
import com.backend.winai.entity.WhatsAppBroadcastRecipient;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

public final class WhatsAppBroadcastDispatchSchedulePlanner {

    private WhatsAppBroadcastDispatchSchedulePlanner() {}

    public static void assignSequentialSendTimes(
            List<WhatsAppBroadcastRecipient> recipientsOrdered,
            Map<UUID, List<WhatsAppBroadcastDispatch>> dispatchesByRecipientId,
            ZonedDateTime campaignStartedAt,
            int windowStartHour,
            int windowEndHour,
            int lunchStartHour,
            int lunchEndHour,
            int minGapSeconds,
            int maxGapSeconds) {

        if (recipientsOrdered.isEmpty()) {
            return;
        }
        int minGap = Math.max(1, minGapSeconds);
        int maxGap = Math.max(minGap, maxGapSeconds);
        boolean useLunch = lunchStartHour >= 0 && lunchEndHour > lunchStartHour;

        List<WhatsAppBroadcastDispatch> orderedDispatches = new ArrayList<>();
        for (WhatsAppBroadcastRecipient r : recipientsOrdered) {
            List<WhatsAppBroadcastDispatch> list =
                    new ArrayList<>(dispatchesByRecipientId.getOrDefault(r.getId(), List.of()));
            list.sort(Comparator.comparingInt(WhatsAppBroadcastDispatch::getSequenceIndex));
            orderedDispatches.addAll(list);
        }

        ZoneId zone = campaignStartedAt.getZone();
        ZonedDateTime now = ZonedDateTime.now(zone);
        ZonedDateTime cursor = campaignStartedAt.isAfter(now) ? campaignStartedAt : now;
        cursor = snapIntoBusinessHours(cursor, zone, windowStartHour, windowEndHour, useLunch,
                lunchStartHour, lunchEndHour);

        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        for (WhatsAppBroadcastDispatch d : orderedDispatches) {
            d.setScheduledSendAt(cursor);
            int gap = rnd.nextInt(minGap, maxGap + 1);
            cursor = cursor.plusSeconds(gap);
            cursor = snapIntoBusinessHours(cursor, zone, windowStartHour, windowEndHour, useLunch,
                    lunchStartHour, lunchEndHour);
        }
    }

    private static ZonedDateTime snapIntoBusinessHours(
            ZonedDateTime z,
            ZoneId zone,
            int windowStartHour,
            int windowEndHour,
            boolean useLunch,
            int lunchStartHour,
            int lunchEndHour) {

        for (int i = 0; i < 500; i++) {
            var day = z.toLocalDate();
            ZonedDateTime dayStart = day.atStartOfDay(zone);
            ZonedDateTime winOpen = dayStart.withHour(windowStartHour).withMinute(0).withSecond(0).withNano(0);
            ZonedDateTime winClose = dayStart.withHour(windowEndHour).withMinute(0).withSecond(0).withNano(0);

            if (z.isBefore(winOpen)) {
                z = winOpen;
                continue;
            }
            if (!z.isBefore(winClose)) {
                z = day.plusDays(1).atStartOfDay(zone).withHour(windowStartHour).withMinute(0).withSecond(0)
                        .withNano(0);
                continue;
            }
            if (useLunch) {
                ZonedDateTime lunchOpen = dayStart.withHour(lunchStartHour).withMinute(0).withSecond(0).withNano(0);
                ZonedDateTime lunchClose = dayStart.withHour(lunchEndHour).withMinute(0).withSecond(0).withNano(0);
                if (!z.isBefore(lunchOpen) && z.isBefore(lunchClose)) {
                    z = lunchClose;
                    continue;
                }
            }
            return z;
        }
        return z;
    }
}
