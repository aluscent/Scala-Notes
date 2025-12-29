import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#7c3aed" },
    secondary: { main: "#fb7185" },
    background: {
      default: "#f7f9fb",
      paper: "#ffffff"
    }
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif",
    h4: {
      fontWeight: 700
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 12,
          fontWeight: 600
        }
      }
    },
    MuiPaper: {
      defaultProps: {
        elevation: 1
      }
    }
  }
});
