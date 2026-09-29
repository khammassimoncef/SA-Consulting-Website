/**
 * SA Consulting — configuration publique (aucune donnée secrète).
 *
 * form.accessKey : clé d'accès Web3Forms liée à contact@saconsulting.biz.
 *   Cette clé est prévue pour être publique : elle permet uniquement d'envoyer
 *   des messages vers l'adresse qui l'a créée. Tant qu'elle est vide, le formulaire
 *   n'envoie rien et propose l'email ou WhatsApp.
 *
 * booking.url : lien de réservation (Calendly, Google Agenda…).
 *   Vide = les boutons « Prendre rendez-vous » mènent au formulaire de contact.
 */
window.SA_CONFIG = {
  form: {
    endpoint: 'https://api.web3forms.com/submit',
    accessKey: '',
    timeoutMs: 15000,
    minFillSeconds: 3
  },
  booking: {
    url: '',
    newTab: true
  }
};
