# NodejsHtmlSessions
Es una sencilla base para comenzar tus nuevos proyectos web en Nodejs. Fácilmente personalizable y escalable.

#### Características principales
- Autentificación de usuarios mediante sesiones y cookies.
- Multilenguaje: Integra un sistema de plantillas para idiomas y traducción de url.
- **Enfocado a SEO**: Núcleo de funciones que permiten crear enlaces multilenguaje y canonización automática.
- Integración con Sendgrid para envío de emails.
- Sistema de plantillas ejs preparado para el uso de layouts y partials.


# Configuración
Toda la configuración del proyecto se realiza dentro del archivo [*/apps/setup.js*]. Durante el desarrollo podrás acceder a esta configuración a través de la variable global [setup].

#### Configuración básica de la app
Dentro del archivo de setup:

*url*
La dirección web para acceder al sitio.

*mongoDB*
String de conexión a la base de datos de mongo.

*adminEmail*
Es la dirección de correo electrónico para gestión del sitio. Se puede utilizar
como dirección de contacto ante incidencias en la web.

*app.name*
El nombre de la web.

*app.codeName*
Nombre en código. Sin acentos, espacios y en minúscula.

*app.email*
La dirección de correo electrónico oficial de contacto del sitio. Se utiliza
en los emails que se envían a los usuarios.

#### Internacionalización
El multi-idioma se adapta a las necesidades de cada proyecto, incluso puede ser desactivado en el archivo de configuración. Existen dos formas de internacionalización:

- Tipo [query]: Los idiomas cambian con un filtro: /users?hl=en, /users?hl=es ...
- Tipo [param]: El idioma se define en la ruta: /es/usuarios , /en/users ...

*queryKey*
El parámetro de configuración queryKey por defecto es 'hl' y será la variable
que contenga el código de idioma cuando esté configurado como tipo query.

# Iniciar el servidor
Puedes utilizar nodemon o node para la puesta en marcha.
[node app.js]
[nodemon app.js]

Para mantenerlo permanentemente iniciado se recomienda *Forever* o *PM2*
