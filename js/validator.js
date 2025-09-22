class CSVValidator {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.dropZone = document.getElementById('dropZone');
        this.processBtn = document.getElementById('processBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.results = document.getElementById('results');
        this.fileInfo = document.getElementById('fileInfo');
        this.validationResults = document.getElementById('validationResults');
        this.columnStats = document.getElementById('columnStats');
        this.preview = document.getElementById('preview');
        
        this.originalData = null;
        this.processedData = null;
        this.fileName = '';
        this.headers = [];
        this.expectedColumns = 0;
        this.validationErrors = [];
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
        
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.style.backgroundColor = '#e3f2fd';
        });
        
        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.style.backgroundColor = '#f8f9fa';
        });
        
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.style.backgroundColor = '#f8f9fa';
            this.handleFileSelect(e.dataTransfer.files[0]);
        });
        
        this.processBtn.addEventListener('click', () => {
            this.processCSV();
        });
        
        this.downloadBtn.addEventListener('click', () => {
            this.downloadProcessedCSV();
        });
    }
    
    handleFileSelect(file) {
        if (!file || !file.name.toLowerCase().endsWith('.csv')) {
            alert('Por favor, selecciona un archivo CSV válido.');
            return;
        }
        
        this.fileName = file.name;
        this.processBtn.disabled = false;
        this.downloadBtn.disabled = true;
        this.results.style.display = 'block';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.parseCSV(e.target.result);
        };
        reader.readAsText(file, 'ISO-8859-1');
    }
    
    parseCSV(csvText) {
        try {
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            
            if (lines.length === 0) {
                throw new Error('El archivo está vacío');
            }
            
            // Detectar delimitador (punto y coma)
            this.headers = lines[0].split(';').map(header => header.trim());
            this.expectedColumns = this.headers.length;
            
            const data = [];
            let rowErrors = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(';');
                
                // Validar número de columnas
                if (values.length !== this.expectedColumns) {
                    rowErrors.push({
                        row: i + 1,
                        expected: this.expectedColumns,
                        actual: values.length,
                        data: values.join(';')
                    });
                    continue;
                }
                
                const row = {};
                this.headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim() : '';
                });
                data.push(row);
            }
            
            this.originalData = data;
            this.displayFileInfo(this.headers, data, rowErrors);
            
            if (rowErrors.length > 0) {
                this.displayValidationErrors(rowErrors);
            }
            
        } catch (error) {
            this.showError('Error al leer el archivo CSV: ' + error.message);
        }
    }
    
    displayFileInfo(headers, data, errors) {
        this.fileInfo.innerHTML = `
            <div class="file-info">
                <strong>Archivo:</strong> ${this.fileName}<br>
                <strong>Total de filas:</strong> ${data.length + errors.length}<br>
                <strong>Filas válidas:</strong> ${data.length}<br>
                <strong>Filas con errores:</strong> ${errors.length}<br>
                <strong>Total de columnas esperadas:</strong> ${headers.length}<br>
                <strong>Columnas detectadas:</strong> ${headers.join(', ')}
            </div>
        `;
        
        let statsHTML = '<div class="column-stats"><h4>Conteo por columna:</h4>';
        headers.forEach(header => {
            const count = data.filter(row => row[header] && row[header].trim() !== '').length;
            const percentage = ((count / data.length) * 100).toFixed(1);
            statsHTML += `
                <div class="stat-item">
                    <strong>${header}:</strong> ${count} valores (${percentage}% lleno)
                </div>
            `;
        });
        statsHTML += '</div>';
        
        this.columnStats.innerHTML = statsHTML;
    }
    
    displayValidationErrors(errors) {
        let errorsHTML = `
            <div class="validation-results">
                <h4 class="error">⚠️ Errores de validación encontrados:</h4>
                <p>Se encontraron ${errors.length} filas con número incorrecto de columnas.</p>
        `;
        
        errors.slice(0, 10).forEach(error => {
            errorsHTML += `
                <div class="validation-item error-item">
                    <strong>Fila ${error.row}:</strong> Esperadas ${error.expected} columnas, 
                    encontradas ${error.actual} columnas<br>
                    <small>Datos: ${error.data.substring(0, 100)}${error.data.length > 100 ? '...' : ''}</small>
                </div>
            `;
        });
        
        if (errors.length > 10) {
            errorsHTML += `<p>... y ${errors.length - 10} errores más</p>`;
        }
        
        errorsHTML += `</div>`;
        this.validationResults.innerHTML = errorsHTML;
    }
    
    normalizeText(text) {
        if (!text) return text;
        
        const replacements = {
            'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
            'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
            'ñ': 'n', 'Ñ': 'N',
            'ü': 'u', 'Ü': 'U'
        };
        
        return text.toString().split('').map(char => 
            replacements[char] || char
        ).join('');
    }
    
    processCSV() {
        if (!this.originalData) return;
        
        try {
            this.processedData = JSON.parse(JSON.stringify(this.originalData));
            
            let changesCount = 0;
            const columns = Object.keys(this.originalData[0] || {});
            
            this.processedData.forEach(row => {
                columns.forEach(column => {
                    const originalValue = row[column];
                    const normalizedValue = this.normalizeText(originalValue);
                    
                    if (originalValue !== normalizedValue) {
                        changesCount++;
                        row[column] = normalizedValue;
                    }
                });
            });
            
            const resultsHTML = `
                <div class="success">
                    ✅ Procesamiento completado.<br>
                    • ${changesCount} normalizaciones de texto realizadas<br>
                    • Tildes eliminadas, ñ convertida a n, ü convertida a u<br>
                    • Archivo listo para descargar
                </div>
            `;
            
            this.validationResults.innerHTML += resultsHTML;
            this.displayPreview();
            this.downloadBtn.disabled = false;
            
        } catch (error) {
            this.showError('Error al procesar el archivo: ' + error.message);
        }
    }
    
    displayPreview() {
        if (!this.processedData || this.processedData.length === 0) return;
        
        const headers = Object.keys(this.processedData[0]);
        const previewData = this.processedData.slice(0, 10);
        
        let tableHTML = '<h4>Vista previa (primeras 10 filas procesadas):</h4><table>';
        
        // Headers
        tableHTML += '<tr>';
        headers.forEach(header => {
            tableHTML += `<th>${header}</th>`;
        });
        tableHTML += '</tr>';
        
        // Rows
        previewData.forEach(row => {
            tableHTML += '<tr>';
            headers.forEach(header => {
                const value = row[header] || '';
                tableHTML += `<td title="${value}">${value.substring(0, 30)}${value.length > 30 ? '...' : ''}</td>`;
            });
            tableHTML += '</tr>';
        });
        
        tableHTML += '</table>';
        this.preview.innerHTML = tableHTML;
    }
    
    downloadProcessedCSV() {
        if (!this.processedData) return;
        
        try {
            const headers = Object.keys(this.processedData[0]);
            let csvContent = headers.join(';') + '\r\n';
            
            this.processedData.forEach(row => {
                const values = headers.map(header => {
                    let value = row[header] || '';
                    // Escapar valores que contengan punto y coma
                    if (value.includes(';') || value.includes('"') || value.includes('\n')) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                csvContent += values.join(';') + '\r\n';
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', this.fileName.replace('.csv', '_procesado.csv'));
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            this.showError('Error al descargar el archivo: ' + error.message);
        }
    }
    
    showError(message) {
        this.validationResults.innerHTML = `
            <div class="error">
                ❌ ${message}
            </div>
        `;
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    new CSVValidator();
});