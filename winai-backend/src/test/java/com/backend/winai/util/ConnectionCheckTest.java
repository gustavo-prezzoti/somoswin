package com.backend.winai.util;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class ConnectionCheckTest {
    @Test
    public void check() {
        String url = "jdbc:postgresql://db.wtfheobvaamelqifttjj.supabase.co:5432/postgres?sslmode=require";
        String user = "postgres";
        String password = "JYAvOfrciMaY4m0j";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("--- User WhatsApp Connections ---");
            String sqlConn = "SELECT id, company_id, instance_name, instance_token, instance_base_url FROM winai.user_whatsapp_connections";
            try (PreparedStatement ptmt = conn.prepareStatement(sqlConn); ResultSet rs = ptmt.executeQuery()) {
                while (rs.next()) {
                    String inst = rs.getString("instance_name");
                    System.out.println("ID: " + rs.getString("id") +
                            " | Company: " + rs.getString("company_id") +
                            " | Instance: [" + inst + "] (len:" + (inst != null ? inst.length() : 0) + ")" +
                            " | Token: " + rs.getString("instance_token") +
                            " | BaseUrl: " + rs.getString("instance_base_url"));
                }
            }

            System.out.println("\n--- Follow Up Configs ---");
            String sqlConfig = "SELECT id, company_id, enabled, inactivity_minutes FROM winai.follow_up_configs";
            try (PreparedStatement ptmt = conn.prepareStatement(sqlConfig); ResultSet rs = ptmt.executeQuery()) {
                while (rs.next()) {
                    System.out.println("ID: " + rs.getString("id") +
                            " | Company: " + rs.getString("company_id") +
                            " | Enabled: " + rs.getBoolean("enabled") +
                            " | Inactivity: " + rs.getInt("inactivity_minutes"));
                }
            }

            System.out.println("\n--- Companies ---");
            String sqlComp = "SELECT id, name FROM winai.companies";
            try (PreparedStatement ptmt = conn.prepareStatement(sqlComp); ResultSet rs = ptmt.executeQuery()) {
                while (rs.next()) {
                    System.out.println("ID: " + rs.getString("id") + " | Name: " + rs.getString("name"));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
