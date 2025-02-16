// src/Flashcards.js
"use client"
import React, { useEffect, useState, useCallback, useMemo } from "react"
import ChartSection from "./components/ChartSection"
import ActionButtonsRow from "./components/ActionButtonsRow"
import FolderSection from "./components/FolderSection"
import NavigationButtons from "./components/NavigationButtons"

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

  const orderedFiles = useMemo(() => {
    if (currentSubfolder && currentSubfolder.csvFiles) {
      return getOrderedCSVFiles(currentSubfolder.csvFiles)
    }
    return []
  }, [currentSubfolder, getOrderedCSVFiles])

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-black">Loading data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-red-500">⚠️ {error}</p>
      </div>
    )
  }

  if (
    flashcards.length === 0 ||
    !currentSubfolder ||
    orderedFiles.length !== 3
  ) {
    // No data or incomplete data
    return null
  }

  return (
    <div className="p-6 w-full max-w-6xl bg-white rounded-lg shadow-lg">
      <ChartSection
        orderedFiles={orderedFiles}
        timer={timer}
        pointsTextArray={pointsTextArray}
      />
      <ActionButtonsRow actionButtons={actionButtons} />
      <FolderSection
        selectedFolder={selectedFolder}
        folderOptions={folderOptions}
        onFolderChange={handleFolderChange}
      />
      <NavigationButtons onPrevious={handlePrevious} onNext={handleNext} />
    </div>
  )
}
