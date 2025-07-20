// ==UserScript==
// @name         Cachetur Changelog Data Extractor
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Extract and download changelog data from cachetur.no/app as JSON
// @author       Olet
// @match        https://cachetur.no/app
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Function to extract clean text content, removing icons but preserving text
  function getCleanTextContent(element) {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);

    // Remove all icon elements (i tags with icon classes)
    const icons = clone.querySelectorAll(
      'i[class*="glyphicon"], i[class*="fa"], i[class*="fal"], i[class*="far"], i[class*="fas"]'
    );
    icons.forEach((icon) => icon.remove());

    // Return the cleaned text content
    return clone.textContent.trim();
  }

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
              let ticketUrl = "";
              let description = "";

              columns.forEach((col, index) => {
                if (col.classList.contains("col-md-1")) {
                  // Time column - remove clock icon
                  time = getCleanTextContent(col);
                } else if (col.classList.contains("col-md-2")) {
                  if (col.querySelector("a")) {
                    // Ticket link column - extract both ticket number and URL
                    const link = col.querySelector("a");
                    if (link) {
                      ticket = link.textContent.trim();
                      ticketUrl = link.href;
                    }
                  } else {
                    // Type column - remove type icon
                    type = getCleanTextContent(col);
                  }
                } else if (col.classList.contains("col-md-7")) {
                  // Description column - remove app icon but keep all text
                  description = getCleanTextContent(col);
                }
              });

              const entry = {
                time: time,
                type: type,
                description: description,
              };

              // Only add ticket info if it exists
              if (ticket) {
                entry.ticket = ticket;
                if (ticketUrl) {
                  entry.ticketUrl = ticketUrl;
                }
              }

              tableData.entries.push(entry);
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
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: background-color 0.3s ease;
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
