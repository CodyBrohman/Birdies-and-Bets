import { Redirect } from 'expo-router';

/** The card now lives on the scorecard screen; this keeps old links working. */
export default function CardScreen() {
  return <Redirect href="/round/play" />;
}
