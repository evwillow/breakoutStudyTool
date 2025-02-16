"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import StockChart from "./StockChart"

const INITIAL_STATE = {
  folders: [],
  selectedFolder: null,
  flashcards: [],
  index: 0,
  loading: false,
  error: null,
}

export default function Flashcards() {
  const [state, setState] = useState(INITIAL_STATE)
  const { folders, selectedFolder, flashcards, index, loading, error } = state

  // Dummy texts for the grid cells.
  const dummyTexts = [
    "SMA Cross",
    "High Volume",
    "RSI Overbought",
    "Bollinger Band",
    "MACD Signal",
    "Breakout",
    "Volume Spike",
    "Trend Reversal",
    "Support",
    "Resistance",
    "Stop Loss",
    "Take Profit",
  ]

  const currentSubfolder = useMemo(
    () => (flashcards.length > 0 ? flashcards[index] : null),
    [flashcards, index]
  )

  const folderOptions = useMemo(
    () =>
      folders.map(({ id, name }) => ({ key: id, value: name, label: name })),
    [folders]
  )

  const getOrderedCSVFiles = useCallback((csvFiles) => {
    const files = new Map()
    for (const file of csvFiles) {
      const fileName = file.fileName
      if (fileName.includes("D.csv")) files.set("D", file)
      else if (fileName.includes("H.csv")) files.set("H", file)
      else if (fileName.includes("M.csv")) files.set("M", file)
    }
    return ["D", "H", "M"].map((key) => files.get(key)).filter(Boolean)
  }, [])

  const orderedFiles = useMemo(
    () =>
      currentSubfolder && currentSubfolder.csvFiles
        ? getOrderedCSVFiles(currentSubfolder.csvFiles)
        : [],
    [currentSubfolder, getOrderedCSVFiles]
  )

  const handleNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      index: (prev.index + 1) % prev.flashcards.length,
    }))
  }, [])

  const handlePrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      index: (prev.index - 1 + prev.flashcards.length) % prev.flashcards.length,
    }))
  }, [])

  const handleFolderChange = useCallback((e) => {
    const newFolder = e.target.value
    setState((prev) => ({
      ...prev,
      selectedFolder: newFolder,
      flashcards: [],
      index: 0,
      error: null,
      loading: true,
    }))
  }, [])

  // Fetch folders on mount.
  useEffect(() => {
    let mounted = true
    fetch("/api/getFolders")
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(`Error fetching folders: ${res.status}`)
      )
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setState((prev) => ({
            ...prev,
            folders: data,
            selectedFolder: data[0]?.name || null,
          }))
        }
      })
      .catch((err) => mounted && setState((prev) => ({ ...prev, error: err })))
    return () => {
      mounted = false
    }
  }, [])

  // Fetch CSV file data when a folder is selected.
  useEffect(() => {
    if (!selectedFolder) return
    let mounted = true
    fetch(`/api/getFileData?folder=${encodeURIComponent(selectedFolder)}`)
      .then((res) =>
        res.ok ? res.json() : res.json().then((err) => Promise.reject(err))
      )
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setState((prev) => ({
            ...prev,
            flashcards: data,
            loading: false,
          }))
        }
      })
      .catch(
        (err) =>
          mounted &&
          setState((prev) => ({
            ...prev,
            error: err.message,
            loading: false,
          }))
      )
    return () => {
      mounted = false
    }
  }, [selectedFolder])

  const renderNavigationButtons = () => (
    <div className="mt-8 flex justify-center">
      <button
        onClick={handlePrevious}
        className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition text-lg mx-2"
      >
        Previous
      </button>
      <button
        onClick={handleNext}
        className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition text-lg mx-2"
      >
        Next
      </button>
    </div>
  )

  const renderFolderSelect = () => (
    <div className="mt-6 w-full flex justify-start">
      <select
        value={selectedFolder || ""}
        onChange={handleFolderChange}
        className="p-3 border rounded-lg text-black w-60"
      >
        {folderOptions.map(({ key, value, label }) => (
          <option key={key} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="p-6 w-full max-w-6xl bg-white rounded-lg shadow-lg">
      {flashcards.length > 0 &&
        !loading &&
        currentSubfolder &&
        orderedFiles.length === 3 && (
          <div className="w-full">
            <div className="flex flex-col md:flex-row gap-4 w-full items-start">
              {/* First Chart Column */}
              <div
                style={{ flexBasis: `${(10 / 26) * 100}%` }}
                className="flex flex-col items-center"
              >
                <div className="w-full text-center">
                  <h2 className="text-lg font-bold text-black">
                    {currentSubfolder.folderName}
                  </h2>
                </div>
                <div className="w-full mt-6">
                  <StockChart csvData={orderedFiles[0].data} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Row for Second and Third Charts */}
                <div className="flex flex-row gap-7">
                  {/* Second Chart with mx-auto */}
                  <div
                    style={{ flexBasis: `${(8 / 14) * 100}%` }}
                    className="flex flex-col items-center"
                  >
                    <StockChart csvData={orderedFiles[1].data} />
                  </div>
                  {/* Third (Square) Chart aligned to bottom */}
                  <div
                    style={{ flexBasis: `${(6 / 14) * 100}%` }}
                    className="flex flex-col items-end"
                  >
                    <div className="pb-6 flex justify-end gap-2 w-full">
                      <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
                        Sign In
                      </button>
                      <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
                        Sign Out
                      </button>
                    </div>
                    <div className="w-full flex justify-center">
                      <div className="w-full max-w-[300px] aspect-square">
                        <StockChart csvData={orderedFiles[2].data} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Grid of Dummy Text Cells */}
                <div className="grid grid-cols-4 gap-6">
                  {dummyTexts.map((text, index) => (
                    <div
                      key={index}
                      className="bg-gray-300 text-black rounded shadow p-1 text-center text-xs"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {renderNavigationButtons()}
            {renderFolderSelect()}
          </div>
        )}

      {loading && (
        <div className="flex justify-center items-center h-96">
          <p className="text-black">Loading data...</p>
        </div>
      )}

      {error && (
        <div className="flex justify-center items-center h-96">
          <p className="text-red-500">⚠️ {error}</p>
        </div>
      )}
    </div>
  )
}
