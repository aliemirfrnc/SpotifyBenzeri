import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export function useTranslationQueue() {
  const [translation, setTranslation] = useState({});
  const translatingLinesRef = useRef(new Set());
  const translationQueueRef = useRef([]);
  const activeTranslatingRef = useRef(0);
  const translationAbortRef = useRef(null);
  const lastTrackRef = useRef(null);

  const resetQueue = useCallback((trackName) => {
    translationAbortRef.current?.abort();
    translationAbortRef.current = new AbortController();
    translatingLinesRef.current.clear();
    translationQueueRef.current = [];
    activeTranslatingRef.current = 0;
    setTranslation({});
    lastTrackRef.current = trackName;
  }, []);

  useEffect(() => {
    return () => {
      translationAbortRef.current?.abort();
    };
  }, []);

  const processTranslationQueue = useCallback(() => {
    if (activeTranslatingRef.current >= 3 || translationQueueRef.current.length === 0) return;
    const task = translationQueueRef.current.shift();
    if (!task) return;

    activeTranslatingRef.current++;
    api.translateLine(task.line, lastTrackRef.current, { signal: translationAbortRef.current?.signal })
      .then((data) => {
        setTranslation(curr => ({ ...curr, [task.line]: data.translation }));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
           setTranslation(curr => ({ ...curr, [task.line]: null }));
        }
      })
      .finally(() => {
        activeTranslatingRef.current--;
        processTranslationQueue();
      });
      
    processTranslationQueue();
  }, []);

  const translateLineQueue = useCallback((line) => {
    if (!line || translatingLinesRef.current.has(line)) return;
    translatingLinesRef.current.add(line);
    translationQueueRef.current.push({ line });
    processTranslationQueue();
  }, [processTranslationQueue]);

  return {
    translation,
    setTranslation,
    translateLineQueue,
    resetQueue,
    lastTrackRef
  };
}
