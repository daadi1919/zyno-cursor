import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme';
import { Chat } from '@/components/Chat';

export default function Home() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Chat />
    </ThemeProvider>
  );
} 