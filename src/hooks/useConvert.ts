import { useState, useEffect, useCallback } from "react"

export type ConvertStatus = "idle" | "processing" | "success" | "error"

interface ConvertState {
  status: ConvertStatus
  progress: number
  progressStep: number
  message: string
  resultPath: string | null
}

const INITIAL: ConvertState = {
  status: "idle",
  progress: 0,
  progressStep: 0,
  message: "",
  resultPath: null,
}

export function useConvert() {
  const [state, setState] = useState<ConvertState>(INITIAL)

  useEffect(() => {
    const unsub = window.electronAPI?.onConvertProgress(({ step, percent }) => {
      setState((prev) => ({ ...prev, progress: percent, progressStep: step }))
    })
    return unsub
  }, [])

  const reset = useCallback(() => setState(INITIAL), [])

  const run = useCallback(
    async (task: () => Promise<string>, steps: string[]) => {
      setState({ ...INITIAL, status: "processing", message: steps[0] ?? "处理中…" })
      try {
        const path = await task()
        setState({
          status: "success",
          progress: 100,
          progressStep: steps.length - 1,
          message: `已保存：${path.split(/[/\\]/).pop()}`,
          resultPath: path,
        })
      } catch (err) {
        setState({
          status: "error",
          progress: 0,
          progressStep: 0,
          message: err instanceof Error ? err.message : "转换失败",
          resultPath: null,
        })
      }
    },
    []
  )

  return { ...state, run, reset }
}
