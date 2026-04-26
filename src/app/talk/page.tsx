import { loadPersonhoodMap } from '@/models/personhood';
import TalkScreen from './TalkScreen';

export default function TalkPage() {
  const map = loadPersonhoodMap();
  const { preferred_name } = map.person;
  const tw = map.this_week;

  const anchors = [
    tw?.whats_happening_today,
    tw?.whos_visiting_or_calling,
  ].filter(Boolean) as string[];

  return <TalkScreen name={preferred_name} anchors={anchors} />;
}
