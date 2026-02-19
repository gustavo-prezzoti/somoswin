package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Notification;
import com.backend.winai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    List<Notification> findByUserAndReadOrderByCreatedAtDesc(User user, Boolean read);

    @Query("SELECT n FROM Notification n WHERE n.user = :user AND n.company = :company ORDER BY n.createdAt DESC")
    List<Notification> findByUserAndCompanyOrderByCreatedAtDesc(@Param("user") User user, @Param("company") Company company);

    @Query("SELECT n FROM Notification n WHERE n.user = :user AND n.company = :company AND n.read = :read ORDER BY n.createdAt DESC")
    List<Notification> findByUserAndCompanyAndReadOrderByCreatedAtDesc(@Param("user") User user, @Param("company") Company company, @Param("read") Boolean read);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user = :user AND n.company = :company AND n.read = false")
    Long countUnreadByUserAndCompany(@Param("user") User user, @Param("company") Company company);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user = :user AND n.company = :company AND n.read = false")
    int markAllAsReadByUserAndCompany(@Param("user") User user, @Param("company") Company company);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user = :user AND n.read = false")
    Long countUnreadByUser(@Param("user") User user);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user = :user AND n.read = false")
    int markAllAsReadByUser(@Param("user") User user);

    void deleteByUser(User user);
}
