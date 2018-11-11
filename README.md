# szoftverarchitekturak_hf
 Az alkalmazás elindítása után (npm start) automatikusan létrehozza a mysql táblákat (5 db). Ezután mysql-ben az alábbi parancsokat kell kiadni:
 ```
create database <config fájlba beállított database név>  (pl. create database surveys;)
use <config fájlba beállított database név>;    (pl. use surveys;)
insert into users values(2,'xy','xy','xy@xy.com','2018-11-10 19:04:15','2018-11-10 19:04:15');
```
A use paranccsal az aktuális adatbázis a config fájlban megadott adatbázis lesz. Míg az insert parancs beszúr egy regisztrált felhasználót, amivel aztán be lehet login-olni az alkalmazásba.
