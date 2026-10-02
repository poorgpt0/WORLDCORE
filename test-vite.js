const { defineConfig } = require('vite');
try {
  defineConfig({
    define: {
      'test': undefined
    }
  });
  console.log("No error on defineConfig");
} catch(e) {
  console.error("Error on defineConfig", e);
}
