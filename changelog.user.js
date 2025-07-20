// ==UserScript==
// @name         Cachetur Changelog Data Extractor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extract and download changelog data from cachetur.no/app as JSON
// @author       Olet
// @match        https://cachetur.no/app
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Function to extract data from tables
  function extractTableData() {
    const tables = [];

    // Find the "Endringslogg" heading
    const endringsloggHeading = Array.from(
      document.querySelectorAll("h2")
    ).find((h) => h.textContent.includes("Endringslogg"));

    if (!endringsloggHeading) {
      alert("Endringslogg heading not found!");
      return null;
    }

    // Find all tables after the Endringslogg heading
    let currentElement = endringsloggHeading.nextElementSibling;
    let currentDate = null;

    while (currentElement) {
      // Check if it's a date heading (h4)
      if (currentElement.tagName === "H4") {
        currentDate = currentElement.textContent.trim();
      }

      // Check if it's a table
      if (currentElement.tagName === "TABLE") {
        const tableData = {
          date: currentDate,
          entries: [],
        };

        // Extract data from table rows
        const rows = currentElement.querySelectorAll("tbody tr");
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length > 0) {
            // Parse the row structure
            const rowDiv = cells[0].querySelector(".row");
            if (rowDiv) {
              const columns = rowDiv.querySelectorAll(
                ".col-md-1, .col-md-2, .col-md-7"
              );

              let time = "";
              let type = "";
              let ticket = "";
              let description = "";

              columns.forEach((col, index) => {
                const text = col.textContent.trim();

                if (col.classList.contains("col-md-1")) {
                  // Time column
                  time = text.replace(/^\s*\S+\s+/, ""); // Remove icon
                } else if (col.classList.contains("col-md-2")) {
                  if (col.querySelector("a")) {
                    // Ticket link column
                    const link = col.querySelector("a");
                    ticket = link
                      ? link.textContent.trim()
                      : text.replace(/^\s*\S+\s+/, "");
                  } else {
                    // Type column
                    type = text.replace(/^\s*\S+\s+/, ""); // Remove icon
                  }
                } else if (col.classList.contains("col-md-7")) {
                  // Description column
                  description = text.replace(/^\s*\S+\s+/, ""); // Remove icon
                }
              });

              tableData.entries.push({
                time: time,
                type: type,
                ticket: ticket,
                description: description,
              });
            }
          }
        });

        if (tableData.entries.length > 0) {
          tables.push(tableData);
        }
      }

      currentElement = currentElement.nextElementSibling;
    }

    return tables;
  }

  // Function to download JSON data
  function downloadJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Function to handle button click
  function handleExtractClick() {
    console.log("Extracting changelog data...");

    const tableData = extractTableData();

    if (tableData && tableData.length > 0) {
      const jsonData = {
        extractedAt: new Date().toISOString(),
        source: "https://cachetur.no/app",
        totalTables: tableData.length,
        totalEntries: tableData.reduce(
          (sum, table) => sum + table.entries.length,
          0
        ),
        data: tableData,
      };

      const filename = `cachetur-changelog-${
        new Date().toISOString().split("T")[0]
      }.json`;
      downloadJSON(jsonData, filename);

      alert(
        `Successfully extracted ${jsonData.totalEntries} changelog entries from ${jsonData.totalTables} tables!`
      );
    } else {
      alert("No table data found or extraction failed!");
    }
  }

  // Create and insert the extraction button
  function createExtractionButton() {
    // Find the "Endringslogg" heading
    const endringsloggHeading = Array.from(
      document.querySelectorAll("h2")
    ).find((h) => h.textContent.includes("Endringslogg"));

    if (!endringsloggHeading) {
      console.error("Endringslogg heading not found!");
      return;
    }

    // Create the button
    const button = document.createElement("button");
    button.textContent = "📥 Extract Changelog Data";
    button.style.cssText = `
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 10px 0;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;

    // Add hover effect
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "#0056b3";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "#007bff";
    });

    // Add click handler
    button.addEventListener("click", handleExtractClick);

    // Insert button before the Endringslogg heading
    endringsloggHeading.parentNode.insertBefore(button, endringsloggHeading);

    console.log("Cachetur Changelog Extractor: Button added successfully!");
  }

  // Wait for page to load completely
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createExtractionButton);
  } else {
    createExtractionButton();
  }
})();
