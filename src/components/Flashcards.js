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

  // Dummy actions for the chart row buttons.
  const actionButtons = [
    "Up 20%",
    "Down <5%",
    "Breakeven",
    "Spike",
    "Dip",
    "Hold",
    "Volatile",
  ]

  // Dummy timer state (counts down from 60 seconds)
  const [timer, setTimer] = useState(60)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

  // Parse points.csv to extract text lines for the grid.
  const pointsTextArray = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.csvFiles) return []
    const pointsFile = currentSubfolder.csvFiles.find(
      (file) => file.fileName.toLowerCase() === "points.csv"
    )
    if (!pointsFile || !pointsFile.data) return []
    return pointsFile.data
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  }, [currentSubfolder])

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

  // Render folder dropdown, data showers, and round buttons.
  const renderFolderSelect = () => (
    <div className="mt-6 w-full flex flex-col items-start">
      <div className="flex items-center">
        {/* Folder Dropdown */}
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
        {/* Data Showers further to the right */}
        <div className="flex flex-col ml-10">
          <div className="flex space-x-8">
            <span className="text-black text-base">Accuracy: (data %)</span>
            <span className="text-black text-base">Win rate: (data %)</span>
            <span className="text-black text-base">Win amount: (data %)</span>
          </div>
          <div className="flex space-x-8 mt-4">
            <span className="text-black text-base">Lose amount: (data %)</span>
          </div>
        </div>
      </div>
      {/* New Round Buttons Row */}
      <div className="mt-6 flex space-x-4">
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
          New Round
        </button>
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
          Load Round
        </button>
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
          Round History
        </button>
      </div>
    </div>
  )

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
                {/* Dummy Timer instead of Folder Title */}
                <div className="w-full text-center">
                  <h2 className="text-lg font-bold text-black">
                    Timer: {timer}s
                  </h2>
                </div>
                <div className="w-full mt-6 relative">
                  {/* Timeframe Label */}
                  <div className="absolute -top-4 left-0 text-xs text-black">
                    D
                  </div>
                  <StockChart csvData={orderedFiles[0].data} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Row for Second and Third Charts */}
                <div className="flex flex-row gap-7">
                  {/* Second Chart */}
                  <div
                    style={{ flexBasis: `${(8 / 14) * 100}%` }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative w-full">
                      {/* Timeframe Label */}
                      <div className="absolute -top-4 left-0 text-xs text-black">
                        H
                      </div>
                      <StockChart csvData={orderedFiles[1].data} />
                    </div>
                  </div>
                  {/* Third (Square) Chart without SMA lines */}
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
                      <div className="w-full max-w-[300px] aspect-square relative">
                        {/* Timeframe Label */}
                        <div className="absolute -top-4 left-0 text-xs text-black">
                          M
                        </div>
                        <StockChart
                          csvData={orderedFiles[2].data}
                          showSMA={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Grid of Text Cells from points.csv */}
                <div className="grid grid-cols-4 gap-6">
                  {pointsTextArray.map((text, index) => (
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

            {/* New Dummy Action Buttons Row */}
            <div className="my-8 flex justify-around">
              {actionButtons.map((action, index) => (
                <button
                  key={index}
                  className="w-24 h-24 bg-gray-300 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs"
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Render the folder section (dropdown, data showers, round buttons)
                and then below it, the navigation buttons */}
            {renderFolderSelect()}
            {renderNavigationButtons()}
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
