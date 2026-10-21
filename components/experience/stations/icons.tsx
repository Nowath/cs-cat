import {
  BookOpen,
  Briefcase,
  ClipboardCheck,
  FlaskConical,
  GraduationCap,
  Info,
  MapPin,
  Newspaper,
  Users,
} from "lucide-react";

// ไอคอนประจำสถานี (ผูกกับ id ใน content/topics.*.json) ไม่มีใน map จะใช้ Info แทน
const ICONS: Record<string, (className: string) => React.ReactNode> = {
  about: (c) => <Info aria-hidden className={c} />,
  undergraduate: (c) => <BookOpen aria-hidden className={c} />,
  careers: (c) => <Briefcase aria-hidden className={c} />,
  graduate: (c) => <GraduationCap aria-hidden className={c} />,
  research: (c) => <FlaskConical aria-hidden className={c} />,
  people: (c) => <Users aria-hidden className={c} />,
  news: (c) => <Newspaper aria-hidden className={c} />,
  admission: (c) => <ClipboardCheck aria-hidden className={c} />,
  contact: (c) => <MapPin aria-hidden className={c} />,
};

export function StationIcon({ id, className = "" }: { id: string; className?: string }) {
  return (ICONS[id] ?? ((c: string) => <Info aria-hidden className={c} />))(className);
}
