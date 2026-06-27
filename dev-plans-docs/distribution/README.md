backend: - Punyak & Aditya
frontend: - Salina & Divya
database: - Daya & Palak

3 microservices for backends (db layer) - (we need something where a logged in user cannot log in from another device, browser etc. - i.e. until the session expires)
1 microservice for database - (3NF - individual and shared tables)
1 single react app - (making sure to use Tailwind to make sure nothing in any of the frontend UIs break, for now the Axios/fetch will be handled in different port 8001, 8002 and 8003, of the three microservices in the backend)
