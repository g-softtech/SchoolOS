# Timetables Module Requirements

## 1. Goal
Provide a robust scheduling system that maps the academic structure (curriculum/subjects) to time slots, teaching venues, and teachers.

## 2. Scope

### In Scope
- **Bell Schedules**: Define standard daily period structures (e.g. Period 1, Break, Period 2).
- **Teaching Days**: Define active school days (e.g. Monday-Friday, excluding weekends).
- **Timetable Slots**: The canonical intersection of:
  - When (Period + Day)
  - Where (Room)
  - Who (Teacher)
  - What (SubjectAssignment)
- **Rooms**: Physical venues and their capacities.
- **Versioning**: Draft and published versions of timetables for a given term.

### Out of Scope
- **Student Roster Mapping**: Timetables do not map individual students to classes. It schedules the *Class Section*. The Students module maps students to sections.
- **Curriculum Definition**: The Academics module defines what subjects must be taught. Timetables only consumes them.
- **Attendance**: Timetables provides the schedule against which Attendance is taken, but it does not track attendance itself.

## 3. Core Capabilities
- Generate and publish weekly schedules per Class Section.
- Resolve conflicts (e.g. double-booking a teacher or room in the same period).
- Support alternative bell schedules (e.g. Exam week, short Fridays).

## 4. Key Events Emitted
- `Timetable.Config.Created`
- `Timetable.Config.Published`
- `Timetable.Slot.Created`
- `Timetable.Slot.Updated`
- `Timetable.Slot.Deleted`
- `Timetable.Teacher.Assigned`
- `Timetable.Room.Changed`
