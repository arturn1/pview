import { FlowCanvas } from './components/canvas/FlowCanvas';
import { AppDialogProvider } from './components/common/AppDialog';

export default function App() {
  return <AppDialogProvider><FlowCanvas /></AppDialogProvider>;
}
