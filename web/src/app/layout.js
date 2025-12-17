import './globals.css';

export const metadata = {
  title: 'EXIM Invoicing System',
  description: 'Export Import Invoicing Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

