# KeepSafe
 Description :
   * -> A Node-JS script to blacklist malicious ips from your nginx servers ( layer 7 protection )
   * -> Un script Node-JS pour blacklister les adresses IP malveillantes de votre serveur nginx ( protection layer 7)

 Installation :
   * -> Put the contents of the `nginx` directory in ``/ect/nginx`` and create a directory in the root file of your machine to install the modules and run your script during a layer 7 attack 
   * -> Mettez le contenu du répertoire `nginx` dans ``/ect/nginx`` et créez un répertoire à la racine de votre machine pour installer les modules et exécuter votre script lors d'une attaque de couche 7 

 Dependencies :
  * [fs](https://www.npmjs.com/package/fs "lien")
  * [nodejs-tail](https://www.npmjs.com/package/nodejs-tail "lien")
  * [shell_exec](https://www.npmjs.com/package/shell_exec "lien")
