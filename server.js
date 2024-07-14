const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

// Cargar el archivo de credenciales del servicio
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(cors());

// Ruta para enviar una notificación a un solo token
app.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    notification: {
      title: title,
      body: body
    },
    token: token
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({ message: 'Notification sent successfully', response });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Error sending notification', details: error });
  }
});

// Ruta para enviar notificaciones a múltiples tokens
app.post('/send-notification/bulk', async (req, res) => {
  const { tokens, title, body } = req.body;

  const messages = tokens.map(token => ({
    notification: {
      title: title,
      body: body
    },
    token: token
  }));

  try {
    const response = await admin.messaging().sendAll(messages);
    // Filtrar los tokens no válidos y los errores de registro
    const failedTokens = response.responses
      .map((resp, idx) => (resp.success ? null : tokens[idx]))
      .filter(token => token !== null);

    res.status(200).json({
      message: 'Notifications sent successfully',
      response,
      failedTokens
    });

    if (failedTokens.length > 0) {
      console.warn('Invalid tokens found:', failedTokens);
      // Aquí podrías manejar la eliminación de los tokens no válidos de tu base de datos
    }

  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: 'Error sending notifications', details: error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
