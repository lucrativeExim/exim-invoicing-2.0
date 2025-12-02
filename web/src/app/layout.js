import './globals.css';

export const metadata = {
  title: 'EXIM Invoicing System',
  description: 'Export Import Invoicing Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

