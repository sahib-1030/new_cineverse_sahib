'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[220px] bg-[#080c12] border border-[#2a3547]/60 rounded-xl flex items-center justify-center font-mono text-xs text-[#8b98aa]">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#ff6b57]" />
        <span>Loading Monaco SQL Workspace...</span>
      </div>
    </div>
  ),
});

interface MonacoSqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
  height?: string;
}

export default function MonacoSqlEditor({
  value,
  onChange,
  onRun,
  readOnly = false,
  height = '240px',
}: MonacoSqlEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const runCallbackRef = useRef(onRun);
  runCallbackRef.current = onRun;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Add custom Cmd+Enter / Ctrl+Enter run action
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runCallbackRef.current?.();
    });

    // Define Cineverse warm graphite theme
    monaco.editor.defineTheme('cineverse-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'dd7058', fontStyle: 'bold' },
        { token: 'string', foreground: 'a7f3d0' },
        { token: 'number', foreground: 'fcd34d' },
        { token: 'comment', foreground: '78716c', fontStyle: 'italic' },
        { token: 'delimiter', foreground: 'd6d3d1' },
      ],
      colors: {
        'editor.background': '#080c12',
        'editor.foreground': '#f7f8fb',
        'editorCursor.foreground': '#ff6b57',
        'editor.lineHighlightBackground': '#1c1917',
        'editorLineNumber.foreground': '#57534e',
        'editorLineNumber.activeForeground': '#ff6b57',
        'editor.selectionBackground': '#44342f',
      },
    });

    monaco.editor.setTheme('cineverse-dark');
  };

  if (!isMounted) {
    return (
      <div
        style={{ height }}
        className="w-full bg-[#080c12] border border-[#2a3547]/60 rounded-xl p-4 font-mono text-xs text-[#f7f8fb] overflow-auto whitespace-pre"
      >
        {value}
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-[#2a3547]/60 shadow-inner bg-[#080c12]">
      <Editor
        height={height}
        language="sql"
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 10, bottom: 10 },
        }}
      />
    </div>
  );
}
