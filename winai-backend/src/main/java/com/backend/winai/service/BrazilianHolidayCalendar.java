package com.backend.winai.service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/**
 * Feriados brasileiros (nacionais). Usado para filtrar dias indisponíveis no agendamento.
 */
public final class BrazilianHolidayCalendar {

    private BrazilianHolidayCalendar() {
    }

    /**
     * Retorna os feriados brasileiros para um ano.
     */
    public static Set<LocalDate> getHolidays(int year) {
        Set<LocalDate> holidays = new HashSet<>();

        // Fixos
        holidays.add(LocalDate.of(year, 1, 1));   // Ano Novo
        holidays.add(LocalDate.of(year, 4, 21));  // Tiradentes
        holidays.add(LocalDate.of(year, 5, 1));   // Dia do Trabalho
        holidays.add(LocalDate.of(year, 9, 7));   // Independência
        holidays.add(LocalDate.of(year, 10, 12)); // Nossa Senhora Aparecida
        holidays.add(LocalDate.of(year, 11, 2));  // Finados
        holidays.add(LocalDate.of(year, 11, 15)); // Proclamação da República
        holidays.add(LocalDate.of(year, 12, 25)); // Natal

        // Variáveis (baseadas na Páscoa)
        LocalDate easter = calculateEaster(year);
        holidays.add(easter.minusDays(47));  // Carnaval (terça)
        holidays.add(easter.minusDays(2));   // Sexta-feira Santa
        holidays.add(easter.plusDays(60));   // Corpus Christi

        return holidays;
    }

    public static boolean isHoliday(LocalDate date) {
        return getHolidays(date.getYear()).contains(date);
    }

    /**
     * Algoritmo de cálculo da Páscoa (Meeus/Jones/Butcher).
     */
    private static LocalDate calculateEaster(int year) {
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = ((h + l - 7 * m + 114) % 31) + 1;
        return LocalDate.of(year, month, day);
    }
}
