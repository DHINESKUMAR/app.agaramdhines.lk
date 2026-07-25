import { useState, useEffect } from 'react';
import { getTimeTable, addNotification } from '../lib/db';

export interface TimetableReminder {
  id: string;
  grade: string;
  subject: string;
  staffName?: string;
  startTime: string;
  endTime: string;
  zoomLinkUrl?: string;
  diffMinutes: number;
  message: string;
  createdAt: string;
}

export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().toUpperCase();
  const isPM = trimmed.includes('PM');
  const isAM = trimmed.includes('AM');
  const cleanTime = trimmed.replace('AM', '').replace('PM', '').trim();
  
  const parts = cleanTime.split(/[:\.]/);
  if (parts.length < 2) return null;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function useTimetableNotifications(
  userRole: 'student' | 'admin' | 'staff',
  userGrade?: string,
  userName?: string
) {
  const [reminders, setReminders] = useState<TimetableReminder[]>([]);

  useEffect(() => {
    const checkTimetableSchedule = async () => {
      const timetable = await getTimeTable();
      if (!Array.isArray(timetable) || timetable.length === 0) {
        setReminders([]);
        return;
      }

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDayName = days[now.getDay()];
      const todayStr = now.toISOString().slice(0, 10);

      // Filter timetable entries for today
      const todayEntries = timetable.filter((entry: any) => {
        if (!entry.day) return false;
        return entry.day.toLowerCase().trim() === currentDayName.toLowerCase().trim();
      });

      const activeReminders: TimetableReminder[] = [];

      for (const entry of todayEntries) {
        // Grade filter for students
        if (userRole === 'student' && userGrade) {
          const sGradeNorm = userGrade.toString().toLowerCase().trim().replace(/[^0-9]/g, '');
          const eGradeNorm = (entry.grade || '').toString().toLowerCase().trim().replace(/[^0-9]/g, '');
          
          if (sGradeNorm && eGradeNorm && sGradeNorm !== eGradeNorm) {
            const sLiteral = userGrade.toString().toLowerCase().trim();
            const eLiteral = (entry.grade || '').toString().toLowerCase().trim();
            if (!sLiteral.includes(eLiteral) && !eLiteral.includes(sLiteral)) {
              continue;
            }
          }
        }

        // Staff filter for staff
        if (userRole === 'staff' && userName) {
          const staffNorm = userName.toString().toLowerCase().trim();
          const entryStaffNorm = (entry.staffName || '').toString().toLowerCase().trim();
          if (entryStaffNorm && !entryStaffNorm.includes(staffNorm) && !staffNorm.includes(entryStaffNorm)) {
            continue;
          }
        }

        const startMins = parseTimeToMinutes(entry.startTime);
        if (startMins === null) continue;

        const diffMinutes = startMins - currentMinutes;

        // Trigger notification if class starts within 60 minutes (and not already past by more than 15 mins)
        if (diffMinutes >= -15 && diffMinutes <= 60) {
          const message = diffMinutes > 0
            ? `${entry.subject} class (${entry.grade}) starts in ${diffMinutes} minutes at ${entry.startTime}.`
            : `${entry.subject} class (${entry.grade}) started ${Math.abs(diffMinutes)} mins ago (${entry.startTime}).`;

          const reminderObj: TimetableReminder = {
            id: `tt-${entry.id}-${todayStr}`,
            grade: entry.grade,
            subject: entry.subject,
            staffName: entry.staffName,
            startTime: entry.startTime,
            endTime: entry.endTime,
            zoomLinkUrl: entry.zoomLinkUrl,
            diffMinutes,
            message,
            createdAt: new Date().toISOString()
          };

          activeReminders.push(reminderObj);

          // Browser Desktop Notification
          const notificationKey = `notified_tt_${entry.id}_${todayStr}_${diffMinutes <= 30 ? '30m' : '60m'}`;
          if (!localStorage.getItem(notificationKey)) {
            localStorage.setItem(notificationKey, 'true');

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`Class Reminder: ${entry.subject}`, {
                  body: message,
                  icon: '/logo.png',
                  tag: entry.id
                });
              } catch (e) {
                console.warn('Browser notification error:', e);
              }
            }

            // Persist to central notification list for student grade / admin
            try {
              await addNotification({
                grade: entry.grade || 'All',
                title: `Upcoming Class Reminder: ${entry.subject}`,
                message: message,
                type: 'zoom_class',
                createdAt: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Could not store timetable notification:', err);
            }
          }
        }
      }

      setReminders(activeReminders);
    };

    checkTimetableSchedule();
    const interval = setInterval(checkTimetableSchedule, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [userRole, userGrade, userName]);

  return { reminders };
}
