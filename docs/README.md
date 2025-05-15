# PWA Proof of Concept -> Full Production PWA (Name still TBD)

## Description 
The PWA proof of concept is built to provide the full suite of capabilities from a PWA to support Firefighting operations in adverse conditions. 
It provides a UI to allow the user full control over the process of inputting Firefighter information and exporting that information in various ways.
This allows for auto-filled PDFs and Excel spreadsheets to allow rapid printing in the field and easier documentation.

## Features
- Progressive Web App (PWA) capabilities for offline functionality
- User-friendly interface for Firefighter information management
- Table generation from imported files (CSV and Excel currently supported)
- PDF generation with auto-filled forms
- Excel spreadsheet export functionality
- Responsive design for various device sizes
- Offline data persistence
- Quick printing capabilities in field conditions

## Installation Steps for Local Machine
1. Install node.js via installer
   - Download from [Node.js official website](https://nodejs.org/)
   - Choose the LTS version for stability
2. Download the attached files into a directory
3. Run "npm install" to install dependencies
4. Run "npm run dev" to run a development build for this PWA
   - This will start the development server with hot-reloading
   - Access the app at `http://localhost:3000`
5. For production deployment, run "npm run build" to create a production build

## Usage Guide
1. **Starting the Application**
   - Launch the application using `npm run dev` for development
   - Access the application through your web browser
   - The app will work offline once installed as a PWA

2. **Managing Firefighter Information**
   - Navigate to the main dashboard
   - Use the input forms to enter Firefighter details
   - Save information for offline access
   - Export data in various formats as needed

3. **Exporting Data**
   - Select the desired export format (PDF/Excel)
   - Choose the data to include in the export
   - Generate and download the formatted document

## Tech Stack
- **Frontend**
  - TypeScript
  - HTML5
  - CSS3
  - Progressive Web App (PWA) features

- **Backend**
  - Node.js

- **Data Processing**
  - XLSX for Excel file handling
  - PDF generation libraries

## Development
- The project uses TypeScript for type safety and better development experience
- Follow the existing code structure and patterns
- Ensure all new features maintain PWA compatibility

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
[Add appropriate license information]

## Support
For support and questions, please [add contact information or issue reporting guidelines]

## Roadmap
- [ ] Add specific features planned for future development
- [ ] List upcoming improvements
- [ ] Currently only Excel spreadsheets formatted in a specific way will format properly
