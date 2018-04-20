<?php
	$dbServer="";
	$dbUser="";
	$dbPassword="";
	$dbDatabase="";
	$db=@mysql_connect($dbServer,$dbUser,$dbPassword);
	mysql_query("set character_set_client='cp1251'");
	mysql_query("set character_set_results='cp1251'");
	mysql_query("set collation_connection='cp1251_general_ci'");

	if(!$db){
		echo mysql_error();
		exit();
	}

	if(!@mysql_select_db($dbDatabase,$db)){
		echo mysql_error();
		exit();
	}
	$sql = "UPDATE mb SET data='".$_POST['submit']."'";
	if(!mysql_query($sql))
	{echo mysql_error();} 
	else 
	{echo '<center>Успешно</center>';}
?>