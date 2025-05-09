import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  List,
  ListItem,
  Divider,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          context: {
            userId: 'user-123', // TODO: Gérer l'authentification
            sessionId: 'session-123',
            timestamp: new Date().toISOString(),
            previousQueries: messages
              .filter((m) => m.role === 'user')
              .map((m) => m.content),
          },
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <List
          sx={{
            flex: 1,
            overflow: 'auto',
            padding: 2,
          }}
        >
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 2,
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  padding: 2,
                  maxWidth: '80%',
                  backgroundColor:
                    message.role === 'user' ? 'primary.light' : 'background.paper',
                }}
              >
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', marginTop: 1, opacity: 0.7 }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </Paper>
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            padding: 2,
            display: 'flex',
            gap: 1,
          }}
        >
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            disabled={loading}
            multiline
            maxRows={4}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !input.trim()}
            sx={{ minWidth: '100px' }}
          >
            {loading ? <CircularProgress size={24} /> : <SendIcon />}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
} 