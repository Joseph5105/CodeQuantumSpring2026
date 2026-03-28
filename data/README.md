### **CodeQuantum 2026: Data Science Track**

*Data compiled by Sean Z. Roberson*

Welcome to CodeQuantum 2026\! This track is designed for hackers who want to explore data science through a real-world dataset.

Unlike traditional data challenges, there is no single prompt or required outcome here. Instead, you have the freedom to explore, analyze, and build something meaningful from the data. This guide will help you get started, understand the dataset, and spark ideas for your project.

---

## **Background**

Formula 1 is a fast-paced, data-driven sport that has seen a huge rise in popularity in recent years. Fans and analysts regularly use data to break down races, visualize performance, and predict outcomes.

For this track, you will be working with real F1 race data and using tools like Python or R to analyze it. Whether you are new to data science or already experienced, this is an opportunity to explore and build something cool.

---

## **Getting Set Up**

If you already have Python installed, you can skip this section.

A simple way to get started is by using Anaconda. You can follow the setup guide here:  
[https://www.anaconda.com/docs/getting-started/main](https://www.anaconda.com/docs/getting-started/main)

You can work in:

* Jupyter Notebook or JupyterLab  
* Visual Studio Code  
* Spyder (included with Anaconda)

At minimum, you should have:

* `numpy`  
* `pandas`

For visualization, you can use:

* `matplotlib`  
* `seaborn`  
* `plotly`

Start by exploring the dataset for at least the first hour. Get familiar with what is available before jumping into building your project.

We also recommend working in a GitHub repository so your team can collaborate and track progress.

---

## **Loading the Data**

Navigate to the `data` folder and download the files. The `.parquet` files contain the full dataset with proper data types.

`import pandas as pd`

`lap_times = pd.read_parquet('LapTimes.parquet')`  
`race_results = pd.read_parquet('RaceResults.parquet')`

`lap_times.head()`  
`race_results.head()`

CSV versions are also provided if you prefer tools like Excel.

---

## **What Should You Build?**

There is no single challenge. The goal is to explore the data and tell a story.

This dataset includes race results and lap times from the 2025 Formula 1 season. It has already been cleaned using the `fastf1` library, so you can focus on analysis instead of preprocessing.

Here are some ideas to get you started:

* Visualize how standings change across the season  
* Analyze what it takes to consistently finish in the top 10  
* Compare qualifying times to actual race performance  
* Evaluate team performance and individual contributions

These are just starting points. You are free to explore anything interesting you find in the data.

---

## **About the Data**

As given in the `fastf1` [documentation](https://docs.fastf1.dev/api_reference/api_autogen/fastf1.core.SessionResults.html#fastf1.core.SessionResults), here's an explanation of the columns in the data set.

* DriverNumber | `str` | The number associated with this driver in this session (usually the driver's permanent number)  
* BroadcastName | `str` | First letter of the driver's first name plus the driver's full last name in all capital letters. (e.g. 'P GASLY')  
* FullName | `str` | The driver's full name (e.g. "Pierre Gasly")  
* Abbreviation | `str` | The driver's three letter abbreviation (e.g. "GAS")  
* DriverId | `str` | driverId that is used by the Ergast API  
* TeamName | `str` | The team name (short version without title sponsors)  
* TeamColor | `str` | The color commonly associated with this team (hex value)  
* TeamId | `str` | constructorId that is used by the Ergast API  
* FirstName | `str` | The driver's first name  
* LastName | `str` | The driver's last name  
* HeadshotUrl | `str` | The URL to the driver's headshot  
* CountryCode | `str` | The driver's country code (e.g. "FRA")  
* Position | `float` | The driver's finishing position (values only given if session is 'Race', 'Qualifying', 'Sprint Shootout', 'Sprint', or 'Sprint Qualifying'). This additionally accounts for post-race penalties and disqualifications if session is 'Race', 'Qualifying', Sprint Shootout', or 'Sprint'.  
* ClassifiedPosition | `str` | The official classification result for each driver. This is either an integer value if the driver is officially classified or one of "R" (retired), "D" (disqualified), "E" (excluded), "W" (withdrawn), "F" (failed to qualify) or "N" (not classified).  
* GridPosition | `float` | The driver's starting position (values only given if session is 'Race', 'Sprint', 'Sprint Shootout' or 'Sprint Qualifying')  
* Q1 | `pd`.`Timedelta` | The driver's best Q1 time (values only given if session is 'Qualifying' or 'Sprint Shootout')  
* Q2 | `pd`.`Timedelta` | The driver's best Q2 time (values only given if session is 'Qualifying' or 'Sprint Shootout')  
* Q3 | `pd`.`Timedelta` | The driver's best Q3 time (values only given if session is 'Qualifying' or 'Sprint Shootout')  
* Time | `pd`.`Timedelta` | The driver's total race time (values only given if session is 'Race', 'Sprint', 'Sprint Shootout' or 'Sprint Qualifying' and the driver was not more than one lap behind the leader)  
* Status | `str` | A status message to indicate if and how the driver finished the race or to indicate the cause of a DNF. Possible values include but are not limited to 'Finished', '+ 1 Lap', 'Crash', 'Gearbox', … (values only given if session is 'Race', 'Sprint', 'Sprint Shootout' or 'Sprint Qualifying')  
* Points | `float` | The number of points received by each driver for their finishing result.  
* Laps | `float` | The number of laps driven by each driver (values only given if session is 'Race' or 'Sprint')

There are two additional columns to make the analyses easier.

* ElapsedTime | `pd`.`Timedelta` | The elapsed final time for each driver, if they finished the race.  
* Round | `int` | The round number in the season.

---

## **Getting Help**

Mentors will be available throughout the event. Feel free to ask questions or reach out in the Discord.

Helpful resources:

* Pandas documentation  
* W3Schools  
* TutorialsPoint  
* FastF1 documentation

---

## **A Note on AI**

AI tools can be helpful, but do not rely on them blindly. Make sure you understand any code or output you use.

Focus on learning, exploring, and building something you understand.

Avoid “vibe coding” your entire project.